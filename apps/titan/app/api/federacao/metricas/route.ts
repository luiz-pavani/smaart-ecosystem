import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role, federacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil || (perfil.role !== 'master_access' && !perfil.federacao_id)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const em30dias = new Date(hoje)
  em30dias.setDate(hoje.getDate() + 30)

  const [
    { count: total },
    { count: ativos },
    { count: vencidos },
    { count: vencendo },
    { data: lotes },
  ] = await Promise.all([
    supabaseAdmin.from('user_fed_lrsj').select('*', { count: 'exact', head: true }).eq('federacao_id', 1),
    supabaseAdmin.from('user_fed_lrsj').select('*', { count: 'exact', head: true }).eq('federacao_id', 1).eq('status_plano', 'Válido'),
    supabaseAdmin.from('user_fed_lrsj').select('*', { count: 'exact', head: true }).eq('federacao_id', 1).eq('status_plano', 'Vencido'),
    supabaseAdmin.from('user_fed_lrsj').select('*', { count: 'exact', head: true })
      .eq('federacao_id', 1)
      .eq('status_plano', 'Válido')
      .not('data_expiracao', 'is', null)
      .gte('data_expiracao', hoje.toISOString().split('T')[0])
      .lte('data_expiracao', em30dias.toISOString().split('T')[0]),
    supabaseAdmin.from('user_fed_lrsj').select('lote_id').eq('federacao_id', 1),
  ])

  // Agrupa por lote
  const loteMap: Record<string, number> = {}
  for (const row of lotes ?? []) {
    const key = row.lote_id || 'Sem lote'
    loteMap[key] = (loteMap[key] ?? 0) + 1
  }
  const loteDistribuicao = Object.entries(loteMap)
    .map(([lote, count]) => ({ lote, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    total: total ?? 0,
    ativos: ativos ?? 0,
    vencidos: vencidos ?? 0,
    vencendo: vencendo ?? 0,
    lotes: loteDistribuicao,
  })
}
