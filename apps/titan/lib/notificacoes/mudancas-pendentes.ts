import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface MudancaResumo {
  campo: string
  valor_antigo: string | null
  valor_novo: string | null
}

const CAMPO_LABEL: Record<string, string> = {
  nome_completo: 'Nome completo',
  kyu_dan_id: 'Faixa (Kyu/Dan)',
  federacao_id: 'Federação',
}

export async function notificarAdminsMudancaPendente(stakeholderId: string, mudancas: MudancaResumo[]) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn('[notificarAdmins] RESEND_API_KEY ou EMAIL_FROM ausente — pulando envio')
    return
  }

  const { data: candidato } = await supabaseAdmin
    .from('stakeholders')
    .select('nome_completo, email, federacao_id')
    .eq('id', stakeholderId)
    .single()

  if (!candidato) return

  const { data: admins } = await supabaseAdmin
    .from('stakeholders')
    .select('email, nome_completo')
    .in('role', ['master_access', 'federacao_admin', 'admin'])
    .not('email', 'is', null)

  if (!admins?.length) return

  // Resolver valores legíveis para mudanças (ex: kyu_dan_id → "Roxa | 2º Kyu")
  const mudancasComLabels = await Promise.all(mudancas.map(async (m) => {
    const label = CAMPO_LABEL[m.campo] || m.campo
    let antigoLegivel = m.valor_antigo
    let novoLegivel = m.valor_novo

    if (m.campo === 'kyu_dan_id') {
      const ids = [m.valor_antigo, m.valor_novo].filter(Boolean).map(Number)
      if (ids.length) {
        const { data: kd } = await supabaseAdmin
          .from('kyu_dan')
          .select('id, cor_faixa, kyu_dan')
          .in('id', ids)
        const map: Record<number, string> = {}
        kd?.forEach(k => { map[k.id] = `${k.cor_faixa} — ${k.kyu_dan}` })
        if (m.valor_antigo) antigoLegivel = map[Number(m.valor_antigo)] || m.valor_antigo
        if (m.valor_novo) novoLegivel = map[Number(m.valor_novo)] || m.valor_novo
      }
    }

    if (m.campo === 'federacao_id') {
      const ids = [m.valor_antigo, m.valor_novo].filter(Boolean)
      if (ids.length) {
        const { data: feds } = await supabaseAdmin
          .from('federacoes')
          .select('id, nome')
          .in('id', ids)
        const map: Record<string, string> = {}
        feds?.forEach(f => { map[f.id] = f.nome })
        if (m.valor_antigo) antigoLegivel = map[m.valor_antigo] || m.valor_antigo
        if (m.valor_novo) novoLegivel = map[m.valor_novo] || m.valor_novo
      }
    }

    return { label, antigoLegivel, novoLegivel }
  }))

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'
  const linkAdmin = `${baseUrl}/portal/candidato/admin/candidatos`

  const linhasHtml = mudancasComLabels.map(m => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${m.label}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#64748b;text-decoration:line-through;">${m.antigoLegivel || '—'}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#16a34a;font-weight:600;">→ ${m.novoLegivel || '—'}</td>
    </tr>`).join('')

  const subject = `[Profep Max] ${mudancas.length} alteração(ões) aguardando aprovação — ${candidato.nome_completo}`

  const html = `
  <!doctype html>
  <html><body style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;padding:24px;color:#0f172a;">
    <h2 style="margin:0 0 4px;color:#4f46e5;">Mudanças aguardando aprovação</h2>
    <p style="color:#64748b;margin:0 0 24px;">Programa de Formação de Faixas Pretas — LRSJ</p>

    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;color:#78350f;"><strong>${candidato.nome_completo}</strong> (${candidato.email}) solicitou alterações em campos críticos do cadastro.</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#475569;">Campo</th>
          <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#475569;">De</th>
          <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#475569;">Para</th>
        </tr>
      </thead>
      <tbody>${linhasHtml}</tbody>
    </table>

    <a href="${linkAdmin}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
      Revisar no painel admin →
    </a>

    <p style="color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;">
      Você está recebendo este email porque tem permissão de administrador no Titan. Para aprovar ou rejeitar, abra o candidato no painel e vá na aba <strong>Pendências</strong>.
    </p>
  </body></html>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const destinatarios = admins.map(a => a.email!).filter(Boolean)

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: destinatarios,
      subject,
      html,
    })
  } catch (err) {
    console.error('[notificarAdmins] erro no envio Resend:', err)
  }
}
