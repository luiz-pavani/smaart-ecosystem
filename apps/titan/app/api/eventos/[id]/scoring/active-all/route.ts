import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/eventos/[id]/scoring/active-all
// Public endpoint — returns active match + score for EACH area of the event
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params

  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('nome, num_areas')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const numAreas = evento.num_areas || 1

  // Get all published/in_progress brackets
  const { data: brackets } = await supabaseAdmin
    .from('event_brackets')
    .select('id, area_id, category:event_categories(nome_display, tempo_luta_seg)')
    .eq('evento_id', eventoId)
    .in('status', ['published', 'in_progress'])

  if (!brackets || brackets.length === 0) {
    return NextResponse.json({
      evento_nome: evento.nome,
      num_areas: numAreas,
      areas: [],
    })
  }

  const bracketIds = brackets.map(b => b.id)
  const bracketMap = new Map(brackets.map(b => [b.id, b]))

  // Get all active/ready matches
  const { data: matches } = await supabaseAdmin
    .from('event_matches')
    .select(`
      id, match_number, tipo, status, bracket_id,
      athlete1_registration_id, athlete2_registration_id,
      athlete1:event_registrations!event_matches_athlete1_registration_id_fkey(id, dados_atleta, academia_id),
      athlete2:event_registrations!event_matches_athlete2_registration_id_fkey(id, dados_atleta, academia_id)
    `)
    .in('bracket_id', bracketIds)
    .in('status', ['in_progress', 'ready'])
    .not('athlete1_registration_id', 'is', null)
    .not('athlete2_registration_id', 'is', null)
    .order('status', { ascending: true })
    .order('match_number', { ascending: true })

  // Get all scores for active matches
  const activeMatchIds = (matches || []).map(m => m.id)
  let scoresMap: Record<string, unknown> = {}
  if (activeMatchIds.length > 0) {
    const { data: scores } = await supabaseAdmin
      .from('event_match_scores')
      .select('*')
      .in('match_id', activeMatchIds)
    if (scores) {
      scoresMap = Object.fromEntries(scores.map(s => [s.match_id, s]))
    }
  }

  // Collect academy names for logo lookup
  const acadNames = new Set<string>()
  for (const m of matches || []) {
    const a1 = m.athlete1 as unknown as { dados_atleta: Record<string, unknown> } | null
    const a2 = m.athlete2 as unknown as { dados_atleta: Record<string, unknown> } | null
    if (a1?.dados_atleta?.academia) acadNames.add(a1.dados_atleta.academia as string)
    if (a2?.dados_atleta?.academia) acadNames.add(a2.dados_atleta.academia as string)
  }

  let logoMap: Record<string, string> = {}
  if (acadNames.size > 0) {
    const { data: logos } = await supabaseAdmin
      .from('academy_logos')
      .select('academia_nome, logo_url')
      .in('academia_nome', Array.from(acadNames))
    if (logos) {
      logoMap = Object.fromEntries(logos.map(l => [l.academia_nome, l.logo_url]))
    }
  }

  // Group by area
  const areas: Array<{
    area_id: number
    active_match: unknown | null
    score: unknown | null
    logos: { athlete1: string | null; athlete2: string | null }
    next_matches: unknown[]
  }> = []

  for (let a = 1; a <= numAreas; a++) {
    const areaBracketIds = new Set(brackets.filter(b => (b.area_id || 1) === a).map(b => b.id))
    const areaMatches = (matches || []).filter(m => areaBracketIds.has(m.bracket_id))

    const activeMatch = areaMatches.find(m => m.status === 'in_progress') || areaMatches[0] || null

    if (!activeMatch) {
      areas.push({ area_id: a, active_match: null, score: null, logos: { athlete1: null, athlete2: null }, next_matches: [] })
      continue
    }

    const bracket = bracketMap.get(activeMatch.bracket_id)
    const cat = bracket?.category as unknown as { nome_display: string; tempo_luta_seg: number } | null

    // Get or create score
    let score = scoresMap[activeMatch.id] as Record<string, unknown> | undefined
    if (!score) {
      const tempoLuta = cat?.tempo_luta_seg || 240
      const { data: newScore } = await supabaseAdmin
        .from('event_match_scores')
        .insert({ match_id: activeMatch.id, modalidade_id: 'judo', clock_seconds: tempoLuta })
        .select()
        .single()
      score = newScore as Record<string, unknown> | undefined
    }

    const a1 = activeMatch.athlete1 as unknown as { dados_atleta: Record<string, unknown> } | null
    const a2 = activeMatch.athlete2 as unknown as { dados_atleta: Record<string, unknown> } | null

    const nextMatches = areaMatches
      .filter(m => m.id !== activeMatch.id)
      .slice(0, 3)
      .map(m => {
        const b = bracketMap.get(m.bracket_id)
        const c = b?.category as unknown as { nome_display: string } | null
        return {
          id: m.id,
          match_number: m.match_number,
          categoria: c?.nome_display || '',
          athlete1_nome: ((m.athlete1 as unknown as { dados_atleta: Record<string, unknown> })?.dados_atleta?.nome_completo as string) || '',
          athlete2_nome: ((m.athlete2 as unknown as { dados_atleta: Record<string, unknown> })?.dados_atleta?.nome_completo as string) || '',
        }
      })

    areas.push({
      area_id: a,
      active_match: {
        ...activeMatch,
        bracket: { id: bracket?.id, area_id: bracket?.area_id, category: cat },
      },
      score: score || null,
      logos: {
        athlete1: logoMap[(a1?.dados_atleta?.academia as string) || ''] || null,
        athlete2: logoMap[(a2?.dados_atleta?.academia as string) || ''] || null,
      },
      next_matches: nextMatches,
    })
  }

  return NextResponse.json({
    evento_nome: evento.nome,
    num_areas: numAreas,
    areas,
  })
}
