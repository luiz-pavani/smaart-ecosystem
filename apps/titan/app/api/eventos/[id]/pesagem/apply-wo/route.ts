import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

async function getRole(userId: string) {
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role ?? null
}

// POST /api/eventos/[id]/pesagem/apply-wo
// body: { registration_id: string }
// Aplica W.O. (fusen-gachi) em todas as lutas pendentes/ready do atleta reprovado na pesagem.
// Motivo: atleta reprovado na pesagem nao pode lutar; adversarios avancam automaticamente.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const { registration_id } = body
  if (!registration_id) {
    return NextResponse.json({ error: 'registration_id obrigatório' }, { status: 400 })
  }

  // Confere que a pesagem existe e esta rejeitada
  const { data: weigh } = await supabaseAdmin
    .from('event_weigh_ins')
    .select('id, status')
    .eq('registration_id', registration_id)
    .eq('evento_id', eventoId)
    .maybeSingle()

  if (!weigh || weigh.status !== 'rejeitado') {
    return NextResponse.json({ error: 'Pesagem não está rejeitada' }, { status: 400 })
  }

  const result = await forfeitAllSubsequentMatches(eventoId, registration_id)
  return NextResponse.json({ ok: true, ...result })
}

async function forfeitAllSubsequentMatches(eventoId: string, loserId: string) {
  const { data: brackets } = await supabaseAdmin
    .from('event_brackets')
    .select('id')
    .eq('evento_id', eventoId)

  if (!brackets || brackets.length === 0) return { affected: 0 }

  const bracketIds = brackets.map(b => b.id)

  const { data: matches } = await supabaseAdmin
    .from('event_matches')
    .select('id, bracket_id, rodada, posicao, tipo, athlete1_registration_id, athlete2_registration_id')
    .in('bracket_id', bracketIds)
    .in('status', ['pending', 'ready'])
    .or(`athlete1_registration_id.eq.${loserId},athlete2_registration_id.eq.${loserId}`)

  if (!matches || matches.length === 0) return { affected: 0 }

  let affected = 0
  for (const m of matches) {
    const winnerId = m.athlete1_registration_id === loserId
      ? m.athlete2_registration_id
      : m.athlete1_registration_id

    if (winnerId) {
      await supabaseAdmin
        .from('event_matches')
        .update({
          winner_registration_id: winnerId,
          resultado: 'fusen-gachi',
          resultado_detalhe: 'Reprovado na pesagem',
          status: 'finished',
        })
        .eq('id', m.id)

      await advanceWinner(m.bracket_id, m, winnerId, loserId)
      affected++
    } else {
      await supabaseAdmin
        .from('event_matches')
        .update({
          status: 'walkover',
          resultado: 'fusen-gachi',
          resultado_detalhe: 'Reprovado na pesagem',
        })
        .eq('id', m.id)
      affected++
    }
  }

  return { affected }
}

// Logica de progressao — copia simplificada do route de matches.
// Mantemos somente main/semifinal/final porque W.O. em pesagem geralmente acontece antes do evento comecar.
async function advanceWinner(
  bracketId: string,
  match: Record<string, unknown>,
  winnerId: string,
  loserId: string | null
) {
  const rodada = match.rodada as number
  const posicao = match.posicao as number
  const tipo = match.tipo as string

  const { data: bracket } = await supabaseAdmin
    .from('event_brackets')
    .select('tipo, num_rodadas')
    .eq('id', bracketId)
    .single()

  if (!bracket) return

  if (tipo === 'main' || tipo === 'semifinal') {
    const nextRound = rodada + 1
    const nextPos = Math.floor(posicao / 2)
    const slot = posicao % 2 === 0 ? 'athlete1_registration_id' : 'athlete2_registration_id'

    const { data: nextMatch } = await supabaseAdmin
      .from('event_matches')
      .select('id')
      .eq('bracket_id', bracketId)
      .eq('rodada', nextRound)
      .eq('posicao', nextPos)
      .in('tipo', ['main', 'semifinal', 'final'])
      .maybeSingle()

    if (nextMatch) {
      const updates: Record<string, unknown> = { [slot]: winnerId }
      const { data: checkMatch } = await supabaseAdmin
        .from('event_matches')
        .select('athlete1_registration_id, athlete2_registration_id')
        .eq('id', nextMatch.id)
        .single()

      if (checkMatch) {
        const otherSlot = slot === 'athlete1_registration_id'
          ? checkMatch.athlete2_registration_id
          : checkMatch.athlete1_registration_id
        if (otherSlot) updates.status = 'ready'
      }

      await supabaseAdmin
        .from('event_matches')
        .update(updates)
        .eq('id', nextMatch.id)
    }

    // Repescagem IJF: perdedor de semifinal vai para bronze
    if (bracket.tipo === 'single_elimination_repechage' && loserId && tipo === 'semifinal') {
      const bronzePos = posicao === 0 ? 201 : 101
      const { data: bronzeMatch } = await supabaseAdmin
        .from('event_matches')
        .select('id, athlete1_registration_id, athlete2_registration_id')
        .eq('bracket_id', bracketId)
        .eq('tipo', 'bronze')
        .eq('posicao', bronzePos)
        .maybeSingle()

      if (bronzeMatch) {
        const bSlot = bronzeMatch.athlete1_registration_id
          ? 'athlete2_registration_id'
          : 'athlete1_registration_id'
        const bUpdates: Record<string, unknown> = { [bSlot]: loserId }
        const otherBSlot = bSlot === 'athlete1_registration_id'
          ? bronzeMatch.athlete2_registration_id
          : bronzeMatch.athlete1_registration_id
        if (otherBSlot) bUpdates.status = 'ready'
        await supabaseAdmin
          .from('event_matches')
          .update(bUpdates)
          .eq('id', bronzeMatch.id)
      }
    }
  }
}
