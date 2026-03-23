import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders').select('role').eq('id', user.id).maybeSingle()
  const allowed = ['master_access', 'federacao_admin', 'federacao_gestor']
  if (!perfil || !allowed.includes(perfil.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const d30 = new Date(now); d30.setDate(now.getDate() + 30)
  const d30str = d30.toISOString().split('T')[0]

  // Last 6 months
  const meses: { label: string; start: string; end: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString().split('T')[0]
    const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    meses.push({
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      start,
      end: endD.toISOString().split('T')[0],
    })
  }

  const [atletasRes, academiasRes] = await Promise.all([
    supabaseAdmin
      .from('user_fed_lrsj')
      .select('status_plano, status_membro, data_expiracao, data_adesao')
      .eq('federacao_id', 1),
    supabaseAdmin
      .from('academias')
      .select('ativo, anualidade_vencimento')
      .eq('federacao_id', '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'),
  ])

  const atletas = atletasRes.data || []
  const academias = academiasRes.data || []

  const ativos     = atletas.filter(a => a.status_plano === 'Válido').length
  const vencidos   = atletas.filter(a => a.status_plano === 'Vencido').length
  const pendentes  = atletas.filter(a => !['Válido','Vencido'].includes(a.status_plano || '')).length
  const vencendo   = atletas.filter(a =>
    a.status_plano === 'Válido' && a.data_expiracao && a.data_expiracao >= today && a.data_expiracao <= d30str
  ).length

  const acadAtivas  = academias.filter(a => a.ativo).length
  const acadVencend = academias.filter(a =>
    a.anualidade_vencimento && a.anualidade_vencimento >= today && a.anualidade_vencimento <= d30str
  ).length
  const acadVencidas = academias.filter(a =>
    a.anualidade_vencimento && a.anualidade_vencimento < today
  ).length

  // New affiliations per month
  const novos_por_mes = meses.map(m => ({
    mes: m.label,
    count: atletas.filter(a => a.data_adesao && a.data_adesao >= m.start && a.data_adesao <= m.end).length,
  }))

  return NextResponse.json({
    atletas: { total: atletas.length, ativos, vencidos, pendentes, vencendo },
    academias: { total: academias.length, ativas: acadAtivas, vencendo: acadVencend, vencidas: acadVencidas },
    novos_por_mes,
  })
}
