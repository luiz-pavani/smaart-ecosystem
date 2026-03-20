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

  const allowed = ['master_access', 'federacao_admin', 'federacao_gestor', 'federacao_staff']
  if (!perfil || !allowed.includes(perfil.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const in30 = new Date(now); in30.setDate(now.getDate() + 30)
  const in30Str = in30.toISOString().split('T')[0]
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const MIN_DATE = '2000-01-01'

  // Pull all needed data in parallel from user_fed_lrsj
  const baseSelect = `
    stakeholder_id, nome_completo, academias, academia_id,
    status_membro, status_plano, data_expiracao, data_adesao,
    telefone, celular, kyu_dan:kyu_dan_id(cor_faixa, nome),
    academia:academia_id(nome, sigla)
  `

  const [pendentesRes, vencendoRes, vencidasRes, novasMesRes] = await Promise.all([
    supabaseAdmin
      .from('user_fed_lrsj')
      .select(baseSelect)
      .eq('federacao_id', 1)
      .or('status_membro.eq.Em análise,status_membro.is.null')
      .order('data_adesao', { ascending: true, nullsFirst: true })
      .limit(200),

    supabaseAdmin
      .from('user_fed_lrsj')
      .select(baseSelect)
      .eq('federacao_id', 1)
      .eq('status_plano', 'Válido')
      .gte('data_expiracao', today)
      .lte('data_expiracao', in30Str)
      .gte('data_expiracao', MIN_DATE)
      .order('data_expiracao', { ascending: true })
      .limit(200),

    supabaseAdmin
      .from('user_fed_lrsj')
      .select(baseSelect)
      .eq('federacao_id', 1)
      .eq('status_plano', 'Vencido')
      .order('data_expiracao', { ascending: true, nullsFirst: false })
      .limit(200),

    supabaseAdmin
      .from('user_fed_lrsj')
      .select('stakeholder_id', { count: 'exact', head: true })
      .eq('federacao_id', 1)
      .gte('data_adesao', startOfMonth),
  ])

  const mapAtleta = (a: any) => {
    const kd = Array.isArray(a.kyu_dan) ? a.kyu_dan[0] : a.kyu_dan
    const ac = Array.isArray(a.academia) ? a.academia[0] : a.academia
    const exp = a.data_expiracao
    const diffDays = exp
      ? Math.ceil((new Date(exp + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000)
      : null

    return {
      id: a.stakeholder_id,
      nome_completo: a.nome_completo,
      academia: ac?.sigla || ac?.nome || a.academias || '—',
      academia_nome: ac?.nome || a.academias || '—',
      graduacao: kd?.nome || null,
      cor_faixa: kd?.cor_faixa || null,
      status_membro: a.status_membro || 'Em análise',
      status_plano: a.status_plano || null,
      data_expiracao: exp || null,
      data_adesao: a.data_adesao || null,
      telefone: a.telefone || a.celular || null,
      dias: diffDays,
    }
  }

  return NextResponse.json({
    pendentes: (pendentesRes.data || []).map(mapAtleta),
    vencendo: (vencendoRes.data || []).map(mapAtleta),
    vencidas: (vencidasRes.data || []).map(mapAtleta),
    novas_mes: novasMesRes.count ?? 0,
  })
}
