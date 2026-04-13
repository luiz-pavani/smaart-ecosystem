import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/eventos/[id]/schedule — all matches grouped by area with A[area]-[seq] labels
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Get evento info
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('nome, num_areas')
    .eq('id', eventoId)
    .maybeSingle()

  // Get all brackets with category info, ordered by area + ordem_no_dia
  const { data: brackets } = await supabaseAdmin
    .from('event_brackets')
    .select(`
      id, area_id, ordem_no_dia, hora_estimada, tipo, status,
      category:event_categories(id, nome_display, genero, tempo_luta_seg, golden_score_seg)
    `)
    .eq('evento_id', eventoId)
    .order('area_id', { ascending: true })
    .order('ordem_no_dia', { ascending: true })

  if (!brackets || brackets.length === 0) {
    return NextResponse.json({
      evento_nome: evento?.nome || '',
      num_areas: evento?.num_areas || 1,
      areas: [],
      total_matches: 0,
    })
  }

  const bracketIds = brackets.map(b => b.id)

  // Get all matches for these brackets
  const { data: matches } = await supabaseAdmin
    .from('event_matches')
    .select(`
      id, bracket_id, match_number, rodada, posicao, tipo, status,
      athlete1_registration_id, athlete2_registration_id, winner_registration_id,
      resultado, resultado_detalhe, duracao_segundos,
      athlete1:event_registrations!event_matches_athlete1_registration_id_fkey(id, dados_atleta, academia_id),
      athlete2:event_registrations!event_matches_athlete2_registration_id_fkey(id, dados_atleta, academia_id)
    `)
    .in('bracket_id', bracketIds)
    .order('match_number', { ascending: true })

  // Build bracket map
  const bracketMap = new Map(brackets.map(b => [b.id, b]))

  // Group matches by area_id, respecting bracket ordem_no_dia
  const numAreas = evento?.num_areas || 1
  const areas: Array<{
    area_id: number
    matches: Array<{
      id: string
      label: string
      seq: number
      bracket_id: string
      categoria: string
      tipo: string
      status: string
      match_number: number
      rodada: number
      posicao: number
      match_tipo: string
      athlete1_nome: string
      athlete1_academia: string
      athlete2_nome: string
      athlete2_academia: string
      winner_registration_id: string | null
      resultado: string | null
    }>
  }> = []

  for (let a = 1; a <= numAreas; a++) {
    // Get brackets assigned to this area
    const areaBracketIds = new Set(
      brackets.filter(b => (b.area_id || 1) === a).map(b => b.id)
    )

    // Get ALL matches for this area, sorted by match_number (already interleaved)
    const areaAllMatches = (matches || [])
      .filter(m => areaBracketIds.has(m.bracket_id) && m.status !== 'walkover')
      .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))

    const areaMatches: typeof areas[0]['matches'] = []
    let seq = 1

    for (const m of areaAllMatches) {
      const bracket = bracketMap.get(m.bracket_id)
      const cat = bracket?.category as unknown as { nome_display: string } | null
      const a1 = m.athlete1 as unknown as { dados_atleta: Record<string, unknown>; academia_id?: string } | null
      const a2 = m.athlete2 as unknown as { dados_atleta: Record<string, unknown>; academia_id?: string } | null

      areaMatches.push({
        id: m.id,
        label: `A${a}-${seq}`,
        seq,
        bracket_id: m.bracket_id,
        categoria: cat?.nome_display || '',
        tipo: bracket?.tipo || '',
        status: m.status,
        match_number: m.match_number,
        rodada: m.rodada,
        posicao: m.posicao,
        match_tipo: m.tipo,
        athlete1_nome: getName(a1?.dados_atleta),
        athlete1_academia: getAcademia(a1?.dados_atleta),
        athlete2_nome: getName(a2?.dados_atleta),
        athlete2_academia: getAcademia(a2?.dados_atleta),
        winner_registration_id: m.winner_registration_id,
        resultado: m.resultado,
      })
      seq++
    }

    areas.push({ area_id: a, matches: areaMatches })
  }

  // Also include unassigned brackets (area_id null)
  const unassigned = brackets.filter(b => !b.area_id)
  if (unassigned.length > 0) {
    const unMatches: typeof areas[0]['matches'] = []
    let seq = 1
    for (const bracket of unassigned) {
      const bracketMatches = (matches || [])
        .filter(m => m.bracket_id === bracket.id && m.status !== 'walkover')
        .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))
      const cat = bracket.category as unknown as { nome_display: string } | null
      for (const m of bracketMatches) {
        const a1 = m.athlete1 as unknown as { dados_atleta: Record<string, unknown> } | null
        const a2 = m.athlete2 as unknown as { dados_atleta: Record<string, unknown> } | null
        unMatches.push({
          id: m.id,
          label: `S/A-${seq}`,
          seq,
          bracket_id: m.bracket_id,
          categoria: cat?.nome_display || '',
          tipo: bracket.tipo,
          status: m.status,
          match_number: m.match_number,
          rodada: m.rodada,
          posicao: m.posicao,
          match_tipo: m.tipo,
          athlete1_nome: getName(a1?.dados_atleta),
          athlete1_academia: getAcademia(a1?.dados_atleta),
          athlete2_nome: getName(a2?.dados_atleta),
          athlete2_academia: getAcademia(a2?.dados_atleta),
          winner_registration_id: m.winner_registration_id,
          resultado: m.resultado,
        })
        seq++
      }
    }
    if (unMatches.length > 0) {
      areas.push({ area_id: 0, matches: unMatches })
    }
  }

  const totalMatches = areas.reduce((s, a) => s + a.matches.length, 0)

  // Also return bracket order preferences from evento.config
  const { data: eventoFull } = await supabaseAdmin
    .from('eventos')
    .select('config')
    .eq('id', eventoId)
    .maybeSingle()

  return NextResponse.json({
    evento_nome: evento?.nome || '',
    num_areas: numAreas,
    areas,
    total_matches: totalMatches,
    category_order: (eventoFull?.config as Record<string, unknown>)?.category_order || null,
  })
}

function getName(dados: Record<string, unknown> | null | undefined): string {
  if (!dados) return ''
  return (dados.nome_completo as string) || (dados.nome as string) || ''
}

function getAcademia(dados: Record<string, unknown> | null | undefined): string {
  if (!dados) return ''
  return (dados.academia as string) || ''
}
