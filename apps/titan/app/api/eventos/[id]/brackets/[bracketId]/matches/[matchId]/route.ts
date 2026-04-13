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

// PATCH /api/eventos/[id]/brackets/[bracketId]/matches/[matchId] — registrar resultado
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string; matchId: string }> }
) {
  const { id: eventoId, bracketId, matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const {
    winner_registration_id,
    resultado,
    resultado_detalhe,
    pontos_athlete1,
    pontos_athlete2,
    duracao_segundos,
  } = body

  if (!winner_registration_id) {
    return NextResponse.json({ error: 'winner_registration_id obrigatório' }, { status: 400 })
  }

  // Get current match
  const { data: match, error: matchErr } = await supabaseAdmin
    .from('event_matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Luta não encontrada' }, { status: 404 })
  }

  // Validate winner is one of the athletes
  if (winner_registration_id !== match.athlete1_registration_id &&
      winner_registration_id !== match.athlete2_registration_id) {
    return NextResponse.json({ error: 'Vencedor deve ser um dos atletas da luta' }, { status: 400 })
  }

  // Update match
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('event_matches')
    .update({
      winner_registration_id,
      resultado: resultado || null,
      resultado_detalhe: resultado_detalhe || null,
      pontos_athlete1: pontos_athlete1 || match.pontos_athlete1,
      pontos_athlete2: pontos_athlete2 || match.pontos_athlete2,
      duracao_segundos: duracao_segundos || null,
      status: 'finished',
    })
    .eq('id', matchId)
    .select()
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Determine loser
  const loserId = winner_registration_id === match.athlete1_registration_id
    ? match.athlete2_registration_id
    : match.athlete1_registration_id

  // === PROGRESSION: advance winner to next match ===
  await advanceWinner(bracketId, match, winner_registration_id, loserId)

  // === DISCIPLINARY HANSOKU-MAKE: forfeit all subsequent fights for the loser ===
  if (resultado === 'hansoku-make-disciplinar' && loserId) {
    await forfeitAllSubsequentMatches(eventoId, loserId)
  }

  return NextResponse.json({ match: updated })
}

/**
 * Advance winner (and loser for repechage/double-elim) to the next match in the bracket.
 */
async function advanceWinner(
  bracketId: string,
  match: Record<string, unknown>,
  winnerId: string,
  loserId: string | null
) {
  const rodada = match.rodada as number
  const posicao = match.posicao as number
  const tipo = match.tipo as string

  // Get bracket info
  const { data: bracket } = await supabaseAdmin
    .from('event_brackets')
    .select('tipo, num_rodadas')
    .eq('id', bracketId)
    .single()

  if (!bracket) return

  // === Main bracket progression ===
  if (tipo === 'main' || tipo === 'semifinal') {
    // Winner goes to next round: rodada+1, position = floor(posicao/2)
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

      // Check if both athletes are now set → status = 'ready'
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

    // === Handle loser for repechage bracket ===
    if (bracket.tipo === 'single_elimination_repechage' && loserId && tipo === 'semifinal') {
      // Semifinal losers go to bronze matches
      // Loser of semifinal at posicao 0 → bronze match at posicao 201 (fights repechage B winner)
      // Loser of semifinal at posicao 1 → bronze match at posicao 101 (fights repechage A winner)
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

    // Bronze match for single_elimination_bronze
    if (bracket.tipo === 'single_elimination_bronze' && loserId && tipo === 'semifinal') {
      const { data: bronzeMatch } = await supabaseAdmin
        .from('event_matches')
        .select('id, athlete1_registration_id, athlete2_registration_id')
        .eq('bracket_id', bracketId)
        .eq('tipo', 'bronze')
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

  // === Repechage match progression ===
  if (tipo === 'repechage') {
    // Find next repechage match in same side (same offset: 100+ or 200+)
    const side = posicao >= 200 ? 200 : 100
    const repRound = posicao - side // current repechage round number

    // Next repechage match
    const nextRepPos = side + repRound + 1
    const { data: nextRep } = await supabaseAdmin
      .from('event_matches')
      .select('id, athlete1_registration_id, athlete2_registration_id')
      .eq('bracket_id', bracketId)
      .eq('tipo', 'repechage')
      .eq('posicao', nextRepPos)
      .maybeSingle()

    if (nextRep) {
      const nSlot = nextRep.athlete1_registration_id
        ? 'athlete2_registration_id'
        : 'athlete1_registration_id'
      await supabaseAdmin
        .from('event_matches')
        .update({ [nSlot]: winnerId, status: 'ready' })
        .eq('id', nextRep.id)
    } else {
      // No more repechage rounds — winner goes to bronze match
      const bronzePos = side === 100 ? 101 : 201
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

        const bUpdates: Record<string, unknown> = { [bSlot]: winnerId }
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

  // === Double elimination: losers bracket progression ===
  if (bracket.tipo === 'double_elimination' && tipo === 'losers') {
    // Similar progression in losers bracket, eventually to grand final
    // Find next losers match
    const nextLosersPos = posicao + 100 // simplified progression
    const { data: nextLosers } = await supabaseAdmin
      .from('event_matches')
      .select('id, athlete1_registration_id, athlete2_registration_id')
      .eq('bracket_id', bracketId)
      .eq('tipo', 'losers')
      .eq('posicao', nextLosersPos)
      .maybeSingle()

    if (nextLosers) {
      const lSlot = nextLosers.athlete1_registration_id
        ? 'athlete2_registration_id'
        : 'athlete1_registration_id'
      await supabaseAdmin
        .from('event_matches')
        .update({ [lSlot]: winnerId })
        .eq('id', nextLosers.id)
    } else {
      // Winner of losers bracket goes to grand final
      const { data: grandFinal } = await supabaseAdmin
        .from('event_matches')
        .select('id, athlete1_registration_id, athlete2_registration_id')
        .eq('bracket_id', bracketId)
        .eq('tipo', 'grand_final')
        .maybeSingle()

      if (grandFinal) {
        const gSlot = grandFinal.athlete1_registration_id
          ? 'athlete2_registration_id'
          : 'athlete1_registration_id'

        const gUpdates: Record<string, unknown> = { [gSlot]: winnerId }
        const otherGSlot = gSlot === 'athlete1_registration_id'
          ? grandFinal.athlete2_registration_id
          : grandFinal.athlete1_registration_id
        if (otherGSlot) gUpdates.status = 'ready'

        await supabaseAdmin
          .from('event_matches')
          .update(gUpdates)
          .eq('id', grandFinal.id)
      }
    }
  }

  // === Update bracket status ===
  // Check if all matches are finished
  const { count: pendingCount } = await supabaseAdmin
    .from('event_matches')
    .select('*', { count: 'exact', head: true })
    .eq('bracket_id', bracketId)
    .neq('status', 'finished')
    .neq('status', 'walkover')

  if (pendingCount === 0) {
    await supabaseAdmin
      .from('event_brackets')
      .update({ status: 'finished' })
      .eq('id', bracketId)
  } else {
    // Ensure bracket is 'in_progress' once first result is recorded
    await supabaseAdmin
      .from('event_brackets')
      .update({ status: 'in_progress' })
      .eq('id', bracketId)
      .eq('status', 'published')
  }
}

/**
 * Disciplinary hansoku-make: forfeit all pending/ready matches for this athlete in the event.
 * The opponent in each match is declared winner by fusen-gachi (W.O.).
 */
async function forfeitAllSubsequentMatches(eventoId: string, loserId: string) {
  // Get all brackets for this event
  const { data: brackets } = await supabaseAdmin
    .from('event_brackets')
    .select('id')
    .eq('evento_id', eventoId)

  if (!brackets || brackets.length === 0) return

  const bracketIds = brackets.map(b => b.id)

  // Find all pending/ready matches where this athlete participates
  const { data: matches } = await supabaseAdmin
    .from('event_matches')
    .select('id, bracket_id, athlete1_registration_id, athlete2_registration_id')
    .in('bracket_id', bracketIds)
    .in('status', ['pending', 'ready'])
    .or(`athlete1_registration_id.eq.${loserId},athlete2_registration_id.eq.${loserId}`)

  if (!matches || matches.length === 0) return

  for (const m of matches) {
    const winnerId = m.athlete1_registration_id === loserId
      ? m.athlete2_registration_id
      : m.athlete1_registration_id

    if (winnerId) {
      // Opponent exists — declare them winner by walkover
      await supabaseAdmin
        .from('event_matches')
        .update({
          winner_registration_id: winnerId,
          resultado: 'fusen-gachi',
          resultado_detalhe: 'Hansoku-make disciplinar do adversario',
          status: 'finished',
        })
        .eq('id', m.id)

      // Advance the winner
      await advanceWinner(m.bracket_id, m, winnerId, loserId)
    } else {
      // No opponent yet — just mark as walkover
      await supabaseAdmin
        .from('event_matches')
        .update({
          status: 'walkover',
          resultado: 'fusen-gachi',
          resultado_detalhe: 'Hansoku-make disciplinar',
        })
        .eq('id', m.id)
    }
  }
}
