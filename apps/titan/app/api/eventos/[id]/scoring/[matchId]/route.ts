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

// GET /api/eventos/[id]/scoring/[matchId] — estado do placar + dados da luta
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Match with athletes
  const { data: match, error: matchErr } = await supabaseAdmin
    .from('event_matches')
    .select(`
      *,
      bracket:event_brackets(id, tipo, category_id, evento_id, area_id,
        category:event_categories(id, nome_display, genero, tempo_luta_seg, golden_score_seg)
      ),
      athlete1:event_registrations!event_matches_athlete1_registration_id_fkey(id, atleta_id, dados_atleta, academia_id),
      athlete2:event_registrations!event_matches_athlete2_registration_id_fkey(id, atleta_id, dados_atleta, academia_id)
    `)
    .eq('id', matchId)
    .maybeSingle()

  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 })
  if (!match) return NextResponse.json({ error: 'Luta não encontrada' }, { status: 404 })

  // Get or create score state
  let { data: score } = await supabaseAdmin
    .from('event_match_scores')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle()

  if (!score) {
    // Auto-create score entry with category time
    const tempoLuta = match.bracket?.category?.tempo_luta_seg || 240
    const { data: newScore } = await supabaseAdmin
      .from('event_match_scores')
      .insert({
        match_id: matchId,
        modalidade_id: 'judo',
        clock_seconds: tempoLuta,
      })
      .select()
      .single()
    score = newScore
  }

  // Get modality config
  const { data: modality } = await supabaseAdmin
    .from('scoring_modalities')
    .select('*')
    .eq('id', score?.modalidade_id || 'judo')
    .single()

  return NextResponse.json({ match, score, modality })
}

// PATCH /api/eventos/[id]/scoring/[matchId] — atualizar estado do placar
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id: eventoId, matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const {
    action,
    pontos_athlete1,
    pontos_athlete2,
    osaekomi_athlete,
    osaekomi_seconds,
    golden_score,
    clock_seconds,
    clock_running,
    status: newStatus,
  } = body

  // Get current score
  const { data: score } = await supabaseAdmin
    .from('event_match_scores')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle()

  if (!score) return NextResponse.json({ error: 'Score não encontrado' }, { status: 404 })

  // Build update object
  const updates: Record<string, unknown> = {}

  // Direct field updates
  if (pontos_athlete1 !== undefined) updates.pontos_athlete1 = pontos_athlete1
  if (pontos_athlete2 !== undefined) updates.pontos_athlete2 = pontos_athlete2
  if (osaekomi_athlete !== undefined) updates.osaekomi_athlete = osaekomi_athlete
  if (osaekomi_seconds !== undefined) updates.osaekomi_seconds = osaekomi_seconds
  if (golden_score !== undefined) updates.golden_score = golden_score
  if (clock_seconds !== undefined) updates.clock_seconds = clock_seconds
  if (clock_running !== undefined) updates.clock_running = clock_running
  if (newStatus !== undefined) updates.status = newStatus

  // Action-based updates for Judô
  if (action) {
    const p1 = { ...(pontos_athlete1 || score.pontos_athlete1 || { wazaari: 0, yuko: 0, shido: 0 }) }
    const p2 = { ...(pontos_athlete2 || score.pontos_athlete2 || { wazaari: 0, yuko: 0, shido: 0 }) }
    if (p1.yuko === undefined) p1.yuko = 0
    if (p2.yuko === undefined) p2.yuko = 0

    switch (action) {
      case 'hajime':
        updates.clock_running = true
        updates.status = score.golden_score ? 'golden_score' : 'running'
        break
      case 'matte':
        updates.clock_running = false
        updates.osaekomi_athlete = null
        updates.osaekomi_seconds = 0
        if (score.status === 'running' || score.status === 'golden_score') {
          updates.status = score.golden_score ? 'golden_score' : 'paused'
        }
        break
      case 'osaekomi_start_1':
        updates.osaekomi_athlete = 1
        updates.osaekomi_seconds = 0
        break
      case 'osaekomi_start_2':
        updates.osaekomi_athlete = 2
        updates.osaekomi_seconds = 0
        break
      case 'osaekomi_stop':
        updates.osaekomi_athlete = null
        updates.osaekomi_seconds = 0
        break
      case 'wazaari_1':
        p1.wazaari = (p1.wazaari || 0) + 1
        updates.pontos_athlete1 = p1
        break
      case 'wazaari_2':
        p2.wazaari = (p2.wazaari || 0) + 1
        updates.pontos_athlete2 = p2
        break
      case 'yuko_1':
        p1.yuko = (p1.yuko || 0) + 1
        updates.pontos_athlete1 = p1
        break
      case 'yuko_2':
        p2.yuko = (p2.yuko || 0) + 1
        updates.pontos_athlete2 = p2
        break
      case 'shido_1':
        p1.shido = (p1.shido || 0) + 1
        updates.pontos_athlete1 = p1
        break
      case 'shido_2':
        p2.shido = (p2.shido || 0) + 1
        updates.pontos_athlete2 = p2
        break
      case 'undo_wazaari_1':
        p1.wazaari = Math.max(0, (p1.wazaari || 0) - 1)
        updates.pontos_athlete1 = p1
        break
      case 'undo_wazaari_2':
        p2.wazaari = Math.max(0, (p2.wazaari || 0) - 1)
        updates.pontos_athlete2 = p2
        break
      case 'undo_yuko_1':
        p1.yuko = Math.max(0, (p1.yuko || 0) - 1)
        updates.pontos_athlete1 = p1
        break
      case 'undo_yuko_2':
        p2.yuko = Math.max(0, (p2.yuko || 0) - 1)
        updates.pontos_athlete2 = p2
        break
      case 'undo_shido_1':
        p1.shido = Math.max(0, (p1.shido || 0) - 1)
        updates.pontos_athlete1 = p1
        break
      case 'undo_shido_2':
        p2.shido = Math.max(0, (p2.shido || 0) - 1)
        updates.pontos_athlete2 = p2
        break
      case 'golden_score':
        updates.golden_score = true
        updates.status = 'golden_score'
        updates.clock_seconds = 0
        updates.clock_running = false
        break
      case 'finish':
        updates.status = 'finished'
        updates.clock_running = false
        updates.osaekomi_athlete = null
        break
      case 'swap_athletes': {
        // Swap scores between athletes
        updates.pontos_athlete1 = score.pontos_athlete2 || { wazaari: 0, yuko: 0, shido: 0 }
        updates.pontos_athlete2 = score.pontos_athlete1 || { wazaari: 0, yuko: 0, shido: 0 }
        // Swap osaekomi side if active
        if (score.osaekomi_athlete === 1) updates.osaekomi_athlete = 2
        else if (score.osaekomi_athlete === 2) updates.osaekomi_athlete = 1

        // Also swap athletes in the match table
        const { data: currentMatch } = await supabaseAdmin
          .from('event_matches')
          .select('athlete1_registration_id, athlete2_registration_id')
          .eq('id', matchId)
          .single()
        if (currentMatch) {
          await supabaseAdmin
            .from('event_matches')
            .update({
              athlete1_registration_id: currentMatch.athlete2_registration_id,
              athlete2_registration_id: currentMatch.athlete1_registration_id,
            })
            .eq('id', matchId)
        }
        break
      }
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from('event_match_scores')
    .update(updates)
    .eq('match_id', matchId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If finishing, also update the match status
  if (updates.status === 'finished' || action === 'finish') {
    await supabaseAdmin
      .from('event_matches')
      .update({ status: 'in_progress' })
      .eq('id', matchId)
      .eq('status', 'ready')
  }
  if (action === 'hajime') {
    await supabaseAdmin
      .from('event_matches')
      .update({ status: 'in_progress' })
      .eq('id', matchId)
      .in('status', ['ready', 'pending'])
  }

  return NextResponse.json({ score: updated })
}
