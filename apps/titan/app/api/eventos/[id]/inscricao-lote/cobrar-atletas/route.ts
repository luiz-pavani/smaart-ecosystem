import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { emailConfirmacaoInscricao } from '@/lib/email'
import { isAcademyStaff, isFederationManager, isMaster } from '@/lib/auth/roles'

/**
 * POST /api/eventos/[id]/inscricao-lote/cobrar-atletas
 * Body: { registration_ids: string[] }
 *
 * Quando técnico optou por "Cada atleta paga", dispara email pra cada
 * inscrição pending_payment com link pro portal atleta concluir o pagamento.
 * As inscrições já foram criadas pelo /inscricao-lote anterior.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('stakeholders')
    .select('role, academia_id, federacao_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!me || !(isMaster(me.role) || isFederationManager(me.role) || isAcademyStaff(me.role))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const ids = Array.isArray(body.registration_ids) ? body.registration_ids.filter((x: unknown) => typeof x === 'string') : []
  if (ids.length === 0) return NextResponse.json({ error: 'registration_ids obrigatório' }, { status: 400 })

  // Carrega inscrições com dados pra email
  const { data: regs } = await supabaseAdmin
    .from('event_registrations')
    .select(`
      id, atleta_id, status, valor_pago, peso_inscricao, event_id,
      category:event_categories!event_registrations_category_id_fkey(nome_display)
    `)
    .in('id', ids)
    .eq('event_id', eventoId)

  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('nome, data_evento, local, cidade, valor_inscricao')
    .eq('id', eventoId)
    .maybeSingle()
  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const dataFmt = evento.data_evento
    ? new Date(evento.data_evento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''
  const localCompleto = [evento.local, evento.cidade].filter(Boolean).join(' — ') || null
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'

  const atletaIds = (regs || []).map(r => r.atleta_id).filter(Boolean) as string[]
  const stakeMap = new Map<string, { nome: string; email: string }>()
  if (atletaIds.length) {
    const { data: stks } = await supabaseAdmin
      .from('stakeholders')
      .select('id, nome_completo, email')
      .in('id', atletaIds)
    for (const s of stks || []) {
      if (s.email) stakeMap.set(s.id, { nome: s.nome_completo || 'Atleta', email: s.email })
    }
  }

  let sent = 0
  let skipped = 0
  for (const reg of regs || []) {
    if (reg.status !== 'pending_payment') { skipped++; continue }
    const stk = reg.atleta_id ? stakeMap.get(reg.atleta_id) : null
    if (!stk) { skipped++; continue }
    const cat = Array.isArray(reg.category) ? reg.category[0] : reg.category
    const catNome = (cat as { nome_display: string } | null)?.nome_display || null
    try {
      await emailConfirmacaoInscricao({
        nome: stk.nome,
        email: stk.email,
        evento_nome: evento.nome,
        evento_data: dataFmt,
        evento_local: localCompleto,
        categoria: catNome,
        precisa_pagar: true,
        precisa_assinar_termos: false,
        link_acompanhar: `${baseUrl}/portal/atleta/eventos/${eventoId}`,
      })
      sent++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ sent, skipped, total: (regs || []).length })
}
