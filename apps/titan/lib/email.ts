import { Resend } from 'resend'

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

/**
 * Envia email via Resend. Retorna boolean indicando sucesso.
 * Não joga exception — falha de email não deve quebrar fluxo principal
 * (filiação, cadastro etc.). Apenas loga.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY ou EMAIL_FROM ausente — pulando envio')
    return false
  }
  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    })
    return true
  } catch (err) {
    console.error('[email] erro no envio Resend:', err)
    return false
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'

const baseLayout = (title: string, body: string) => `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,system-ui,Segoe UI,Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <tr>
              <td style="background:#15803d;padding:28px 32px;text-align:center;border-bottom:4px solid #dc2626;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Titan</h1>
                <p style="margin:6px 0 0;color:#dcfce7;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Liga Riograndense de Judô</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#0f172a;">${title}</h2>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background:#f8fafc;padding:20px 32px;border-top:3px solid #dc2626;text-align:center;color:#64748b;font-size:12px;line-height:1.6;">
                <p style="margin:0 0 4px;color:#15803d;font-weight:700;">Liga Riograndense de Judô</p>
                <a href="${BASE_URL}" style="color:#64748b;text-decoration:none;">${BASE_URL.replace(/^https?:\/\//, '')}</a>
                <p style="margin:8px 0 0;color:#94a3b8;font-size:11px;">Este é um email automático do Titan. Em caso de dúvida, responda à sua federação.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

interface ConfirmacaoPagamentoParams {
  nome: string
  descricao: string
  valor: number
  email: string
  dataPagamento?: string
}

interface ConfirmacaoInscricaoParams {
  nome: string
  email: string
  evento_nome: string
  evento_data: string // formato livre ex: "30 ago 2026"
  evento_local: string | null
  categoria: string | null
  precisa_pagar: boolean
  precisa_assinar_termos: boolean
  link_acompanhar: string
}

/** Email de confirmação de pagamento (filiação, evento, anuidade). */
export async function emailConfirmacaoPagamento(p: ConfirmacaoPagamentoParams) {
  const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)
  const data = p.dataPagamento || new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      Olá <strong>${escapeHtml(p.nome)}</strong>, recebemos seu pagamento. ✅
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:4px solid #15803d;border-radius:8px;padding:16px 18px;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#475569;font-size:13px;">Descrição</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0f172a;">${escapeHtml(p.descricao)}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;font-size:13px;">Valor</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#15803d;font-size:16px;">${valorFmt}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;font-size:13px;">Data</td><td style="padding:6px 0;text-align:right;color:#374151;">${data}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#374151;">
      Você pode consultar o histórico completo no
      <a href="${BASE_URL}/portal/atleta/financeiro" style="color:#15803d;font-weight:600;">portal financeiro</a>.
    </p>
  `
  return sendEmail({
    to: p.email,
    subject: `Pagamento confirmado — ${p.descricao}`,
    html: baseLayout('Pagamento confirmado', body),
  })
}

/** Email de confirmação de inscrição em evento. */
export async function emailConfirmacaoInscricao(p: ConfirmacaoInscricaoParams) {
  const proximosPassos: string[] = []
  if (p.precisa_pagar) proximosPassos.push('Realizar o pagamento da taxa de inscrição.')
  if (p.precisa_assinar_termos) proximosPassos.push('Assinar os termos de responsabilidade.')
  if (!p.precisa_pagar && !p.precisa_assinar_termos) proximosPassos.push('Aguardar a confirmação da pesagem oficial no dia.')

  const proximosPassosHtml = proximosPassos
    .map(passo => `<li style="margin:6px 0;">${escapeHtml(passo)}</li>`)
    .join('')

  const detalhesRows: Array<[string, string]> = [
    ['Evento', p.evento_nome],
    ['Data', p.evento_data],
  ]
  if (p.evento_local) detalhesRows.push(['Local', p.evento_local])
  if (p.categoria) detalhesRows.push(['Categoria', p.categoria])

  const detalhesHtml = detalhesRows
    .map(([k, v]) => `
      <tr>
        <td style="padding:6px 0;color:#475569;font-size:13px;">${escapeHtml(k)}</td>
        <td style="padding:6px 0;text-align:right;font-weight:600;color:#0f172a;">${escapeHtml(v)}</td>
      </tr>`)
    .join('')

  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      Olá <strong>${escapeHtml(p.nome)}</strong>, sua inscrição foi recebida com sucesso. ✅
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:4px solid #15803d;border-radius:8px;padding:16px 18px;margin:16px 0;">
      ${detalhesHtml}
    </table>
    <p style="margin:16px 0 8px;font-size:14px;color:#374151;font-weight:600;">Próximos passos:</p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#374151;line-height:1.5;">
      ${proximosPassosHtml}
    </ul>
    <p style="margin:16px 0 0;font-size:14px;color:#374151;">
      Acompanhe sua inscrição em
      <a href="${escapeAttr(p.link_acompanhar)}" style="color:#15803d;font-weight:600;">${escapeHtml(p.link_acompanhar)}</a>.
    </p>
  `
  return sendEmail({
    to: p.email,
    subject: `Inscrição confirmada — ${p.evento_nome}`,
    html: baseLayout('Inscrição recebida', body),
  })
}

interface ResetSenhaParams {
  email: string
  nome?: string
  linkRecuperacao: string
}

/** Email com link de recuperação de senha. */
export async function emailResetSenha(p: ResetSenhaParams) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      Olá${p.nome ? ' <strong>' + escapeHtml(p.nome) + '</strong>' : ''}, recebemos um pedido de redefinição de senha para sua conta no Titan.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;">
      Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
    </p>
    <p style="margin:24px 0;">
      <a href="${escapeAttr(p.linkRecuperacao)}" style="display:inline-block;background:#15803d;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
        Redefinir minha senha
      </a>
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
      Se você não solicitou essa alteração, ignore este email — sua senha continua a mesma.
    </p>
  `
  return sendEmail({
    to: p.email,
    subject: 'Redefinição de senha — Titan',
    html: baseLayout('Redefinir senha', body),
  })
}

// ── helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  )
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
