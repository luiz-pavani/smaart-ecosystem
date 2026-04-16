import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/rankings — ranking geral cross-evento
// ?federacao_id=xxx &genero=Masculino &categoria=Sub-18
export async function GET(req: NextRequest) {
  const federacaoId = req.nextUrl.searchParams.get('federacao_id') || null
  const genero = req.nextUrl.searchParams.get('genero') || null
  const categoriaFilter = req.nextUrl.searchParams.get('categoria') || null

  // Get all ranking points
  let query = supabaseAdmin
    .from('event_ranking_points')
    .select('atleta_id, pontos, categoria, evento_id')

  if (categoriaFilter) {
    query = query.ilike('categoria', `%${categoriaFilter}%`)
  }

  const { data: points } = await query

  if (!points || points.length === 0) {
    return NextResponse.json({ ranking: [], total: 0 })
  }

  // Aggregate by atleta_id
  const agg: Record<string, { atleta_id: string; total_pontos: number; eventos: number; ouros: number; pratas: number; bronzes: number }> = {}
  for (const p of points) {
    if (!p.atleta_id) continue
    if (!agg[p.atleta_id]) agg[p.atleta_id] = { atleta_id: p.atleta_id, total_pontos: 0, eventos: 0, ouros: 0, pratas: 0, bronzes: 0 }
    agg[p.atleta_id].total_pontos += p.pontos
    agg[p.atleta_id].eventos++
  }

  // Get medal counts from event_results
  const atletaIds = Object.keys(agg)
  if (atletaIds.length > 0) {
    const { data: results } = await supabaseAdmin
      .from('event_results')
      .select('atleta_id, medal')
      .in('atleta_id', atletaIds)
      .not('medal', 'is', null)

    for (const r of results || []) {
      if (!r.atleta_id || !agg[r.atleta_id]) continue
      if (r.medal === 'gold') agg[r.atleta_id].ouros++
      else if (r.medal === 'silver') agg[r.atleta_id].pratas++
      else if (r.medal === 'bronze') agg[r.atleta_id].bronzes++
    }
  }

  // Get athlete names
  let nameMap: Record<string, { nome: string; academia: string }> = {}
  if (atletaIds.length > 0) {
    const { data: stakeholders } = await supabaseAdmin
      .from('stakeholders')
      .select('id, full_name, genero')
      .in('id', atletaIds)

    const { data: fedData } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select('user_id, nome_completo, academia_id')
      .in('user_id', atletaIds)

    // Get academia names
    const acadIds = (fedData || []).map(f => f.academia_id).filter(Boolean) as string[]
    let acadMap: Record<string, string> = {}
    if (acadIds.length > 0) {
      const { data: acads } = await supabaseAdmin
        .from('academias')
        .select('id, nome')
        .in('id', acadIds)
      if (acads) acadMap = Object.fromEntries(acads.map(a => [a.id, a.nome]))
    }

    for (const s of stakeholders || []) {
      if (genero && s.genero && s.genero !== genero) {
        delete agg[s.id]
        continue
      }
      nameMap[s.id] = { nome: s.full_name || '', academia: '' }
    }
    for (const f of fedData || []) {
      if (nameMap[f.user_id]) {
        nameMap[f.user_id].nome = f.nome_completo || nameMap[f.user_id].nome
        nameMap[f.user_id].academia = acadMap[f.academia_id] || ''
      } else {
        nameMap[f.user_id] = { nome: f.nome_completo || '', academia: acadMap[f.academia_id] || '' }
      }
    }
  }

  const ranking = Object.values(agg)
    .map(a => ({
      ...a,
      nome: nameMap[a.atleta_id]?.nome || 'Atleta',
      academia: nameMap[a.atleta_id]?.academia || '',
    }))
    .sort((a, b) => b.total_pontos - a.total_pontos)

  return NextResponse.json({ ranking, total: ranking.length })
}
