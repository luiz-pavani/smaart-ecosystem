import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/eventos/[id]/scoring/active?area=1
// Public endpoint — finds the current active match for a given event/area
// Priority: in_progress > ready (with both athletes)
// Returns match + score + next upcoming matches
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const area = req.nextUrl.searchParams.get('area')
  const areaId = area ? parseInt(area) : null

  // Get event name
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('nome')
    .eq('id', eventoId)
    .maybeSingle()

  // Build bracket filter
  let bracketQuery = supabaseAdmin
    .from('event_brackets')
    .select('id, area_id, category:event_categories(nome_display, tempo_luta_seg)')
    .eq('evento_id', eventoId)
    .in('status', ['published', 'in_progress'])

  if (areaId) bracketQuery = bracketQuery.eq('area_id', areaId)

  const { data: brackets } = await bracketQuery
  if (!brackets || brackets.length === 0) {
    return NextResponse.json({
      evento_nome: evento?.nome || '',
      area: areaId,
      active_match: null,
      next_matches: [],
    })
  }

  const bracketIds = brackets.map(b => b.id)
  const bracketMap = new Map(brackets.map(b => [b.id, b]))

  // Find in_progress match first, then ready matches
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
    .order('status', { ascending: true }) // in_progress first
    .order('match_number', { ascending: true })

  if (!matches || matches.length === 0) {
    return NextResponse.json({
      evento_nome: evento?.nome || '',
      area: areaId,
      active_match: null,
      next_matches: [],
    })
  }

  // The active match is the first in_progress, or the first ready
  const activeMatch = matches.find(m => m.status === 'in_progress') || matches[0]
  const bracket = bracketMap.get(activeMatch.bracket_id)
  const cat = bracket?.category as unknown as { nome_display: string; tempo_luta_seg: number } | null

  // Get score for active match
  let { data: score } = await supabaseAdmin
    .from('event_match_scores')
    .select('*')
    .eq('match_id', activeMatch.id)
    .maybeSingle()

  if (!score) {
    const tempoLuta = cat?.tempo_luta_seg || 240
    const { data: newScore } = await supabaseAdmin
      .from('event_match_scores')
      .insert({
        match_id: activeMatch.id,
        modalidade_id: 'judo',
        clock_seconds: tempoLuta,
      })
      .select()
      .single()
    score = newScore
  }

  // Fetch academy logos for active match athletes
  const acadNames: string[] = []
  const a1data = (activeMatch.athlete1 as unknown as { dados_atleta: Record<string, unknown>; academia_id?: string })
  const a2data = (activeMatch.athlete2 as unknown as { dados_atleta: Record<string, unknown>; academia_id?: string })
  if (a1data?.dados_atleta?.academia) acadNames.push(a1data.dados_atleta.academia as string)
  if (a2data?.dados_atleta?.academia) acadNames.push(a2data.dados_atleta.academia as string)

  let logoMap: Record<string, string> = {}
  if (acadNames.length > 0) {
    const { data: logos } = await supabaseAdmin
      .from('academy_logos')
      .select('academia_nome, logo_url')
      .in('academia_nome', acadNames)
    if (logos) {
      logoMap = Object.fromEntries(logos.map(l => [l.academia_nome, l.logo_url]))
    }
  }

  // Build next matches list (exclude active)
  const nextMatches = matches
    .filter(m => m.id !== activeMatch.id)
    .slice(0, 5)
    .map(m => {
      const b = bracketMap.get(m.bracket_id)
      const c = b?.category as unknown as { nome_display: string } | null
      return {
        id: m.id,
        match_number: m.match_number,
        tipo: m.tipo,
        status: m.status,
        area_id: b?.area_id,
        categoria: c?.nome_display || '',
        athlete1_nome: ((m.athlete1 as unknown as { dados_atleta: Record<string, unknown> })?.dados_atleta?.nome_completo as string) || '',
        athlete2_nome: ((m.athlete2 as unknown as { dados_atleta: Record<string, unknown> })?.dados_atleta?.nome_completo as string) || '',
      }
    })

  return NextResponse.json({
    evento_nome: evento?.nome || '',
    area: areaId,
    active_match: {
      ...activeMatch,
      bracket: {
        id: bracket?.id,
        area_id: bracket?.area_id,
        category: cat,
      },
    },
    score,
    next_matches: nextMatches,
    logos: {
      athlete1: logoMap[(a1data?.dados_atleta?.academia as string) || ''] || null,
      athlete2: logoMap[(a2data?.dados_atleta?.academia as string) || ''] || null,
    },
  })
}
