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

// GET /api/eventos/[id]/resultados — resultados + quadro de medalhas
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  // Public endpoint — no auth required
  // Get results
  const { data: results } = await supabaseAdmin
    .from('event_results')
    .select('*')
    .eq('evento_id', eventoId)
    .order('categoria', { ascending: true })
    .order('colocacao', { ascending: true })

  // Build medal board by academia
  const medalBoard: Record<string, { academia: string; gold: number; silver: number; bronze: number; total: number }> = {}
  for (const r of results || []) {
    if (!r.medal) continue
    const key = r.academia_nome || r.academia_id || 'Sem academia'
    if (!medalBoard[key]) medalBoard[key] = { academia: key, gold: 0, silver: 0, bronze: 0, total: 0 }
    if (r.medal === 'gold') medalBoard[key].gold++
    else if (r.medal === 'silver') medalBoard[key].silver++
    else if (r.medal === 'bronze') medalBoard[key].bronze++
    medalBoard[key].total++
  }

  const board = Object.values(medalBoard).sort((a, b) =>
    b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze
  )

  return NextResponse.json({ results: results || [], medal_board: board })
}

// POST /api/eventos/[id]/resultados/generate — gerar resultados a partir das chaves finalizadas
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

  // Get finished brackets
  const { data: brackets } = await supabaseAdmin
    .from('event_brackets')
    .select(`
      id, tipo, category_id,
      category:event_categories(id, nome_display, genero)
    `)
    .eq('evento_id', eventoId)
    .eq('status', 'finished')

  if (!brackets || brackets.length === 0) {
    return NextResponse.json({ error: 'Nenhuma chave finalizada' }, { status: 400 })
  }

  const newResults: Array<Record<string, unknown>> = []

  for (const bracket of brackets) {
    const cat = bracket.category as unknown as { id: string; nome_display: string; genero: string } | null
    const catName = cat?.nome_display || 'Sem categoria'

    // Get all matches for this bracket
    const { data: matches } = await supabaseAdmin
      .from('event_matches')
      .select('*')
      .eq('bracket_id', bracket.id)
      .eq('status', 'finished')

    if (!matches || matches.length === 0) continue

    // Helper to fetch registrations and build athlete info
    const fetchRegsAndBuild = async (regIds: string[]) => {
      const { data: regs } = await supabaseAdmin
        .from('event_registrations')
        .select('id, atleta_id, academia_id, dados_atleta')
        .in('id', regIds)
      const regMap = new Map((regs || []).map(r => [r.id, r]))
      const getInfo = (regId: string) => {
        const reg = regMap.get(regId)
        if (!reg) return { academia_id: null, academia_nome: '', atleta_id: null, atleta_nome: '' }
        const dados = reg.dados_atleta || {}
        return {
          academia_id: reg.academia_id,
          academia_nome: (dados as Record<string, unknown>).academia as string || '',
          atleta_id: reg.atleta_id,
          atleta_nome: ((dados as Record<string, unknown>).nome_completo as string) || ((dados as Record<string, unknown>).nome as string) || '',
        }
      }
      return getInfo
    }

    // --- ROUND ROBIN: rank by wins > wazaari diff > head-to-head ---
    if (bracket.tipo === 'round_robin') {
      // Collect all unique athlete registration IDs
      const athleteIds = new Set<string>()
      for (const m of matches) {
        if (m.athlete1_registration_id) athleteIds.add(m.athlete1_registration_id)
        if (m.athlete2_registration_id) athleteIds.add(m.athlete2_registration_id)
      }

      // Build stats per athlete
      const stats: Record<string, { wins: number; losses: number; wazaariFor: number; wazaariAgainst: number }> = {}
      for (const id of athleteIds) stats[id] = { wins: 0, losses: 0, wazaariFor: 0, wazaariAgainst: 0 }

      // Head-to-head map: h2h[A][B] = true means A beat B
      const h2h: Record<string, Record<string, boolean>> = {}

      for (const m of matches) {
        const a1 = m.athlete1_registration_id
        const a2 = m.athlete2_registration_id
        if (!a1 || !a2 || !m.winner_registration_id) continue

        const p1 = m.pontos_athlete1 as { wazaari?: number } | null
        const p2 = m.pontos_athlete2 as { wazaari?: number } | null
        const w1 = p1?.wazaari || 0
        const w2 = p2?.wazaari || 0

        stats[a1].wazaariFor += w1
        stats[a1].wazaariAgainst += w2
        stats[a2].wazaariFor += w2
        stats[a2].wazaariAgainst += w1

        if (m.winner_registration_id === a1) {
          stats[a1].wins++
          stats[a2].losses++
          if (!h2h[a1]) h2h[a1] = {}
          h2h[a1][a2] = true
        } else {
          stats[a2].wins++
          stats[a1].losses++
          if (!h2h[a2]) h2h[a2] = {}
          h2h[a2][a1] = true
        }
      }

      // Sort: wins DESC > wazaari diff DESC > head-to-head
      const ranked = [...athleteIds].sort((a, b) => {
        const sa = stats[a], sb = stats[b]
        if (sb.wins !== sa.wins) return sb.wins - sa.wins
        const diffA = sa.wazaariFor - sa.wazaariAgainst
        const diffB = sb.wazaariFor - sb.wazaariAgainst
        if (diffB !== diffA) return diffB - diffA
        // Head-to-head
        if (h2h[a]?.[b]) return -1
        if (h2h[b]?.[a]) return 1
        return 0
      })

      const getInfo = await fetchRegsAndBuild(ranked)

      for (let i = 0; i < ranked.length; i++) {
        const colocacao = i + 1
        const medal = colocacao === 1 ? 'gold' : colocacao === 2 ? 'silver' : colocacao === 3 ? 'bronze' : null
        const a = getInfo(ranked[i])
        newResults.push({
          evento_id: eventoId,
          bracket_id: bracket.id,
          registration_id: ranked[i],
          category_id: bracket.category_id,
          categoria: catName,
          colocacao,
          medal,
          atleta_nome: a.atleta_nome,
          atleta_id: a.atleta_id,
          academia_id: a.academia_id,
          academia_nome: a.academia_nome,
        })
      }
      continue
    }

    // --- ELIMINATION BRACKETS (single, repechage, double, etc.) ---
    // Find final match
    const finalMatch = matches.find(m => m.tipo === 'final' || m.tipo === 'grand_final')
    if (!finalMatch || !finalMatch.winner_registration_id) continue

    // Gold: winner of final
    const goldRegId = finalMatch.winner_registration_id
    // Silver: loser of final
    const silverRegId = finalMatch.winner_registration_id === finalMatch.athlete1_registration_id
      ? finalMatch.athlete2_registration_id
      : finalMatch.athlete1_registration_id

    // Bronze: winners of bronze matches
    const bronzeMatches = matches.filter(m => m.tipo === 'bronze' && m.winner_registration_id)
    const bronzeRegIds = bronzeMatches.map(m => m.winner_registration_id)

    // Fetch athlete data for all medalists
    const regIds = [goldRegId, silverRegId, ...bronzeRegIds].filter(Boolean) as string[]
    const getInfo = await fetchRegsAndBuild(regIds)

    // Gold
    if (goldRegId) {
      const a = getInfo(goldRegId)
      newResults.push({
        evento_id: eventoId,
        bracket_id: bracket.id,
        registration_id: goldRegId,
        category_id: bracket.category_id,
        categoria: catName,
        colocacao: 1,
        medal: 'gold',
        atleta_nome: a.atleta_nome,
        atleta_id: a.atleta_id,
        academia_id: a.academia_id,
        academia_nome: a.academia_nome,
      })
    }

    // Silver
    if (silverRegId) {
      const a = getInfo(silverRegId)
      newResults.push({
        evento_id: eventoId,
        bracket_id: bracket.id,
        registration_id: silverRegId,
        category_id: bracket.category_id,
        categoria: catName,
        colocacao: 2,
        medal: 'silver',
        atleta_nome: a.atleta_nome,
        atleta_id: a.atleta_id,
        academia_id: a.academia_id,
        academia_nome: a.academia_nome,
      })
    }

    // Bronze (1 or 2 depending on bracket type)
    for (const bRegId of bronzeRegIds) {
      if (!bRegId) continue
      const a = getInfo(bRegId)
      newResults.push({
        evento_id: eventoId,
        bracket_id: bracket.id,
        registration_id: bRegId,
        category_id: bracket.category_id,
        categoria: catName,
        colocacao: 3,
        medal: 'bronze',
        atleta_nome: a.atleta_nome,
        atleta_id: a.atleta_id,
        academia_id: a.academia_id,
        academia_nome: a.academia_nome,
      })
    }
  }

  if (newResults.length === 0) {
    return NextResponse.json({ error: 'Nenhum resultado para gerar' }, { status: 400 })
  }

  // Delete existing results for this event (regenerate)
  await supabaseAdmin.from('event_results').delete().eq('evento_id', eventoId)

  const { error } = await supabaseAdmin.from('event_results').insert(newResults)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ total: newResults.length })
}
