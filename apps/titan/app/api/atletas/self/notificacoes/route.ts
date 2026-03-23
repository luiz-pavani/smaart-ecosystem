import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface Notificacao {
  tipo: 'plano_vencendo' | 'plano_vencido' | 'graduacao_pronta' | 'evento_proximo'
  titulo: string
  mensagem: string
  urgencia: 'info' | 'warning' | 'danger'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ notificacoes: [] })

  const notificacoes: Notificacao[] = []
  const hoje = new Date()
  const em30dias = new Date(hoje); em30dias.setDate(hoje.getDate() + 30)
  const em7dias = new Date(hoje); em7dias.setDate(hoje.getDate() + 7)

  // ── Plano do atleta ──────────────────────────────────────────────────────
  const { data: atleta } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('status_plano, data_vencimento_plano, nome_completo')
    .eq('user_id', user.id)
    .maybeSingle()

  if (atleta) {
    if (atleta.status_plano === 'Vencido' || atleta.status_plano === 'Expired') {
      notificacoes.push({
        tipo: 'plano_vencido',
        titulo: 'Plano Vencido',
        mensagem: 'Sua filiação está vencida. Renove para manter acesso a eventos e benefícios.',
        urgencia: 'danger',
      })
    } else if (atleta.data_vencimento_plano) {
      const vencimento = new Date(atleta.data_vencimento_plano)
      if (vencimento <= em30dias && vencimento > hoje) {
        const dias = Math.ceil((vencimento.getTime() - hoje.getTime()) / 86400000)
        notificacoes.push({
          tipo: 'plano_vencendo',
          titulo: 'Plano Vencendo em Breve',
          mensagem: `Sua filiação vence em ${dias} dia${dias !== 1 ? 's' : ''} (${vencimento.toLocaleDateString('pt-BR')}). Renove para não perder o acesso.`,
          urgencia: dias <= 7 ? 'danger' : 'warning',
        })
      }
    }
  }

  // ── Eventos próximos (inscritos) ─────────────────────────────────────────
  const { data: regs } = await supabaseAdmin
    .from('event_registrations')
    .select('event:eventos(id, nome, data_evento)')
    .eq('atleta_id', user.id)

  const eventosProximos = (regs || [])
    .map((r: any) => r.event)
    .filter((e: any) => e?.data_evento && new Date(e.data_evento) >= hoje && new Date(e.data_evento) <= em7dias)

  for (const ev of eventosProximos) {
    const dias = Math.ceil((new Date(ev.data_evento).getTime() - hoje.getTime()) / 86400000)
    notificacoes.push({
      tipo: 'evento_proximo',
      titulo: 'Evento em ' + (dias === 0 ? 'Hoje!' : `${dias} dia${dias !== 1 ? 's' : ''}!`),
      mensagem: `Você está inscrito em "${ev.nome}" — ${new Date(ev.data_evento).toLocaleDateString('pt-BR')}.`,
      urgencia: dias === 0 ? 'danger' : 'warning',
    })
  }

  return NextResponse.json({ notificacoes })
}
