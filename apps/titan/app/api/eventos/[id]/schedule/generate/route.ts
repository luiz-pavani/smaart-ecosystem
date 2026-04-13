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

/**
 * POST /api/eventos/[id]/schedule/generate
 *
 * Body:
 *   category_order: string[]  — ordered list of category IDs (organizer preference)
 *   strategy: 'round_robin' | 'sequential'
 *   hora_inicio: string — "HH:MM" start time (default "09:00")
 *   intervalo_entre_categorias_min: number — gap between categories in minutes (default 2)
 *
 * Fight duration and interval between fights come from each category's own config:
 *   - event_categories.tempo_luta_seg (fight time in seconds)
 *   - event_categories.intervalo_entre_lutas_seg (interval between fights in seconds)
 *   Falls back to event_age_groups defaults if not set on category.
 */
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
  const {
    category_order = [],
    strategy = 'round_robin',
    hora_inicio = '09:00',
    intervalo_entre_categorias_min = 2,
  } = body

  // Get evento
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('num_areas, config')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const numAreas = evento.num_areas || 1

  // Get all brackets with category + age_group for time info
  const { data: brackets } = await supabaseAdmin
    .from('event_brackets')
    .select(`
      id, category_id, tipo, status, num_rodadas,
      category:event_categories(
        id, nome_display, tempo_luta_seg, golden_score_seg, intervalo_entre_lutas_seg,
        age_group:event_age_groups(tempo_luta_seg, golden_score_seg, intervalo_entre_lutas_seg)
      )
    `)
    .eq('evento_id', eventoId)

  if (!brackets || brackets.length === 0) {
    return NextResponse.json({ error: 'Nenhuma chave encontrada' }, { status: 400 })
  }

  // Count matches per bracket
  const bracketMatchCounts = new Map<string, number>()
  for (const b of brackets) {
    const { count } = await supabaseAdmin
      .from('event_matches')
      .select('*', { count: 'exact', head: true })
      .eq('bracket_id', b.id)
      .neq('status', 'walkover')
    bracketMatchCounts.set(b.id, count || 0)
  }

  // Helper: get effective fight duration in minutes for a bracket
  const getFightMinutes = (b: typeof brackets[0]): number => {
    const cat = b.category as unknown as {
      tempo_luta_seg: number | null
      intervalo_entre_lutas_seg: number | null
      age_group: { tempo_luta_seg: number | null; intervalo_entre_lutas_seg: number | null } | null
    } | null

    // Fight time: category override → age_group default → 240s
    const fightSec = cat?.tempo_luta_seg || cat?.age_group?.tempo_luta_seg || 240
    // Interval between fights: category override → age_group default → 60s
    const intervalSec = cat?.intervalo_entre_lutas_seg ?? cat?.age_group?.intervalo_entre_lutas_seg ?? 60

    // Total per fight = fight time + interval, converted to minutes
    return (fightSec + intervalSec) / 60
  }

  // Build bracket time map (total minutes for all fights in this bracket)
  const bracketTimeMap = new Map<string, number>()
  for (const b of brackets) {
    const numMatches = bracketMatchCounts.get(b.id) || 0
    const perFight = getFightMinutes(b)
    bracketTimeMap.set(b.id, numMatches * perFight)
  }

  // Order brackets by category_order preference, then by nome_display
  const orderMap = new Map<string, number>()
  ;(category_order as string[]).forEach((catId: string, idx: number) => {
    orderMap.set(catId, idx)
  })

  const orderedBrackets = [...brackets].sort((a, b) => {
    const aIdx = orderMap.has(a.category_id) ? orderMap.get(a.category_id)! : 9999
    const bIdx = orderMap.has(b.category_id) ? orderMap.get(b.category_id)! : 9999
    if (aIdx !== bIdx) return aIdx - bIdx
    const aName = (a.category as unknown as { nome_display: string })?.nome_display || ''
    const bName = (b.category as unknown as { nome_display: string })?.nome_display || ''
    return aName.localeCompare(bName)
  })

  // Distribute brackets across areas
  const areaAssignments: Array<{
    bracket_id: string; area_id: number; ordem: number;
    num_matches: number; total_minutes: number
  }> = []

  if (strategy === 'sequential') {
    const perArea = Math.ceil(orderedBrackets.length / numAreas)
    orderedBrackets.forEach((b, i) => {
      const areaId = Math.min(Math.floor(i / perArea) + 1, numAreas)
      const ordem = areaAssignments.filter(a => a.area_id === areaId).length + 1
      areaAssignments.push({
        bracket_id: b.id,
        area_id: areaId,
        ordem,
        num_matches: bracketMatchCounts.get(b.id) || 0,
        total_minutes: bracketTimeMap.get(b.id) || 0,
      })
    })
  } else {
    // Round-robin: distribute evenly by total time (not just match count)
    const areaLoad = new Array(numAreas).fill(0) // minutes
    const areaOrdem = new Array(numAreas).fill(0)

    for (const b of orderedBrackets) {
      let minArea = 0
      for (let a = 1; a < numAreas; a++) {
        if (areaLoad[a] < areaLoad[minArea]) minArea = a
      }
      const areaId = minArea + 1
      areaOrdem[minArea]++
      const totalMin = bracketTimeMap.get(b.id) || 0
      areaLoad[minArea] += totalMin

      areaAssignments.push({
        bracket_id: b.id,
        area_id: areaId,
        ordem: areaOrdem[minArea],
        num_matches: bracketMatchCounts.get(b.id) || 0,
        total_minutes: totalMin,
      })
    }
  }

  // Compute hora_estimada per bracket using real times
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24
    const m = Math.round(mins % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const startMinutes = parseTime(hora_inicio)
  const areaClock = new Array(numAreas + 1).fill(startMinutes)

  areaAssignments.sort((a, b) => a.area_id - b.area_id || a.ordem - b.ordem)

  const updates: Array<{ bracket_id: string; area_id: number; ordem_no_dia: number; hora_estimada: string }> = []

  for (const assign of areaAssignments) {
    const hora = formatTime(areaClock[assign.area_id])
    updates.push({
      bracket_id: assign.bracket_id,
      area_id: assign.area_id,
      ordem_no_dia: assign.ordem,
      hora_estimada: hora,
    })
    // Advance clock by actual category time + inter-category gap
    areaClock[assign.area_id] += assign.total_minutes + intervalo_entre_categorias_min
  }

  // Apply updates to brackets
  for (const u of updates) {
    await supabaseAdmin
      .from('event_brackets')
      .update({
        area_id: u.area_id,
        ordem_no_dia: u.ordem_no_dia,
        hora_estimada: u.hora_estimada,
      })
      .eq('id', u.bracket_id)
  }

  // Renumber match_number per area with INTERLEAVING:
  // Instead of all fights from bracket A then bracket B, interleave
  // so athletes get rest time between their own fights.
  // Strategy: round-robin across brackets — take 1 match from each bracket in order,
  // but always keep finals last within their bracket group.
  for (let a = 1; a <= numAreas; a++) {
    const areaBracketIds = updates.filter(u => u.area_id === a)
      .sort((x, y) => x.ordem_no_dia - y.ordem_no_dia)
      .map(u => u.bracket_id)

    // Fetch all matches per bracket, ordered so final is last
    const bracketQueues: Array<{ id: string; tipo: string }[]> = []
    for (const bracketId of areaBracketIds) {
      const { data: matches } = await supabaseAdmin
        .from('event_matches')
        .select('id, tipo, match_number')
        .eq('bracket_id', bracketId)
        .neq('status', 'walkover')
        .order('match_number', { ascending: true })

      if (matches && matches.length > 0) {
        // Sort: non-final first, final always last
        const sorted = matches.sort((a, b) => {
          const aFinal = a.tipo === 'final' ? 1 : 0
          const bFinal = b.tipo === 'final' ? 1 : 0
          if (aFinal !== bFinal) return aFinal - bFinal
          return (a.match_number || 0) - (b.match_number || 0)
        })
        bracketQueues.push(sorted.map(m => ({ id: m.id, tipo: m.tipo })))
      }
    }

    // Interleave: round-robin take 1 from each bracket queue
    // Finals are held back and appended at the end (in bracket order)
    const interleaved: string[] = []
    const finals: string[] = []

    // Separate finals from each queue
    const queues = bracketQueues.map(q => {
      const nonFinal = q.filter(m => m.tipo !== 'final')
      const finalMatch = q.filter(m => m.tipo === 'final')
      finals.push(...finalMatch.map(m => m.id))
      return nonFinal.map(m => m.id)
    })

    // Round-robin interleave non-final matches
    let hasMore = true
    while (hasMore) {
      hasMore = false
      for (const q of queues) {
        if (q.length > 0) {
          interleaved.push(q.shift()!)
          hasMore = true
        }
      }
    }

    // Append finals at the end (in bracket order)
    interleaved.push(...finals)

    // Apply sequential numbering
    let matchSeq = 1
    for (const matchId of interleaved) {
      await supabaseAdmin
        .from('event_matches')
        .update({ match_number: matchSeq })
        .eq('id', matchId)
      matchSeq++
    }
  }

  // Save settings to evento.config
  const currentConfig = (evento.config as Record<string, unknown>) || {}
  await supabaseAdmin
    .from('eventos')
    .update({
      config: {
        ...currentConfig,
        category_order: category_order,
        schedule_settings: {
          strategy,
          hora_inicio,
          intervalo_entre_categorias_min,
        },
      },
    })
    .eq('id', eventoId)

  return NextResponse.json({
    ok: true,
    total_brackets: updates.length,
    areas: Array.from({ length: numAreas }, (_, i) => ({
      area_id: i + 1,
      brackets: updates.filter(u => u.area_id === i + 1).length,
      matches: areaAssignments.filter(a => a.area_id === i + 1).reduce((s, a) => s + a.num_matches, 0),
    })),
  })
}
