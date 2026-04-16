import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

// POST /api/eventos/[id]/resultados/ranking-points — gerar pontos de ranking a partir dos resultados
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stk } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).maybeSingle()
  if (!stk || !ADMIN_ROLES.includes(stk.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Get ranking config
  const { data: config } = await supabaseAdmin
    .from('ranking_config')
    .select('pontos_por_colocacao')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  const pontosPorColocacao = (config?.pontos_por_colocacao || { '1': 100, '2': 70, '3': 50, '5': 30, '7': 20 }) as Record<string, number>

  // Get results for this event
  const { data: results } = await supabaseAdmin
    .from('event_results')
    .select('*')
    .eq('evento_id', eventoId)

  if (!results || results.length === 0) {
    return NextResponse.json({ error: 'Nenhum resultado para pontuar' }, { status: 400 })
  }

  // Delete existing ranking points for this event
  await supabaseAdmin.from('event_ranking_points').delete().eq('evento_id', eventoId)

  // Calculate points
  const rows = results.map(r => {
    const col = String(r.colocacao)
    // Find closest key: 1, 2, 3, 5, 7 etc
    let pontos = 0
    const keys = Object.keys(pontosPorColocacao).map(Number).sort((a, b) => a - b)
    for (const k of keys) {
      if (r.colocacao <= k) { pontos = pontosPorColocacao[String(k)]; break }
    }
    // Exact match takes priority
    if (pontosPorColocacao[col] !== undefined) pontos = pontosPorColocacao[col]

    return {
      evento_id: eventoId,
      result_id: r.id,
      registration_id: r.registration_id,
      atleta_id: r.atleta_id,
      categoria: r.categoria,
      category_id: r.category_id,
      colocacao: r.colocacao,
      pontos,
    }
  })

  const { error } = await supabaseAdmin.from('event_ranking_points').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ total: rows.length, pontos_config: pontosPorColocacao })
}
