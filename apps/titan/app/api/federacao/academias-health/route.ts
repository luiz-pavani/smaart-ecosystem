import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role, federacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const isMaster = perfil?.role === 'master_access'
  const fedId = perfil?.federacao_id

  if (!isMaster && !fedId) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const fedFilter = isMaster ? {} : { federacao_id: fedId }

  const { data: academias } = await supabaseAdmin
    .from('academias')
    .select('id, nome, sigla, ativo, anualidade_status, anualidade_vencimento, responsavel_telefone, responsavel_email')
    .match(fedFilter)
    .eq('ativo', true)
    .order('nome')

  if (!academias?.length) return NextResponse.json({ academias: [] })

  const ids = academias.map((a: any) => a.id)

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Atletas por academia: total e ativos
  const { data: atletasCounts } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('academia_id, status_plano')
    .in('academia_id', ids)

  const totalMap: Record<string, number> = {}
  const ativosMap: Record<string, number> = {}
  ;(atletasCounts || []).forEach((a: any) => {
    totalMap[a.academia_id] = (totalMap[a.academia_id] || 0) + 1
    if (a.status_plano === 'Válido') ativosMap[a.academia_id] = (ativosMap[a.academia_id] || 0) + 1
  })

  const result = academias.map((a: any) => {
    const total = totalMap[a.id] || 0
    const ativos = ativosMap[a.id] || 0
    const pctAtivos = total > 0 ? Math.round((ativos / total) * 100) : 0

    // Saúde da anuidade
    let anuidade_status: 'ok' | 'vencendo' | 'vencida' | 'indefinida' = 'indefinida'
    let dias_vencimento: number | null = null

    if (a.anualidade_vencimento) {
      const diff = Math.floor(
        (new Date(a.anualidade_vencimento).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      )
      dias_vencimento = diff
      if (diff < 0) anuidade_status = 'vencida'
      else if (diff <= 30) anuidade_status = 'vencendo'
      else anuidade_status = 'ok'
    }

    // Score geral de saúde (0-100)
    let health = 100
    if (anuidade_status === 'vencida') health -= 40
    else if (anuidade_status === 'vencendo') health -= 20
    if (pctAtivos < 50) health -= 30
    else if (pctAtivos < 70) health -= 15
    if (total === 0) health = 30

    const nivel: 'bom' | 'atencao' | 'critico' =
      health >= 70 ? 'bom' : health >= 40 ? 'atencao' : 'critico'

    return {
      id: a.id,
      nome: a.nome,
      sigla: a.sigla,
      responsavel_telefone: a.responsavel_telefone,
      total_atletas: total,
      atletas_ativos: ativos,
      pct_ativos: pctAtivos,
      anuidade_status,
      anualidade_vencimento: a.anualidade_vencimento,
      dias_vencimento,
      health_score: Math.max(0, health),
      nivel,
    }
  }).sort((a: any, b: any) => a.health_score - b.health_score) // piores primeiro

  return NextResponse.json({ academias: result })
}
