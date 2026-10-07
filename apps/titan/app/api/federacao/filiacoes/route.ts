import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { anexarKyuDan, filtroStatusMembro, rotuloStatusMembro } from '@/lib/filiacao/lrsj'

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
    stakeholder_id, nome_completo, academia_id,
    status_membro, status_plano, data_expiracao, data_adesao,
    telefone, kyu_dan_id,
    academia:academia_id(nome, sigla)
  `

  const [pendentesRes, vencendoRes, vencidasRes, novasMesRes] = await Promise.all([
    supabaseAdmin
      .from('user_fed_lrsj')
      .select(baseSelect)
      .or(filtroStatusMembro('pendente'))
      .order('data_adesao', { ascending: true, nullsFirst: true })
      .limit(200),

    supabaseAdmin
      .from('user_fed_lrsj')
      .select(baseSelect)
      .eq('status_plano', 'Válido')
      .gte('data_expiracao', today)
      .lte('data_expiracao', in30Str)
      .gte('data_expiracao', MIN_DATE)
      .order('data_expiracao', { ascending: true })
      .limit(200),

    supabaseAdmin
      .from('user_fed_lrsj')
      .select(baseSelect)
      .eq('status_plano', 'Vencido')
      .order('data_expiracao', { ascending: true, nullsFirst: false })
      .limit(200),

    supabaseAdmin
      .from('user_fed_lrsj')
      .select('stakeholder_id', { count: 'exact', head: true })
      .gte('data_adesao', startOfMonth),
  ])

  const mapAtleta = (a: any) => {
    const kd = a.kyu_dan
    const ac = Array.isArray(a.academia) ? a.academia[0] : a.academia
    const exp = a.data_expiracao
    const diffDays = exp
      ? Math.ceil((new Date(exp + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000)
      : null

    return {
      id: a.stakeholder_id,
      nome_completo: a.nome_completo,
      academia: ac?.sigla || ac?.nome || '—',
      academia_nome: ac?.nome || '—',
      graduacao: kd?.kyu_dan || null,
      cor_faixa: kd?.cor_faixa || null,
      status_membro: rotuloStatusMembro(a.status_membro),
      status_plano: a.status_plano || null,
      data_expiracao: exp || null,
      data_adesao: a.data_adesao || null,
      telefone: a.telefone || null,
      dias: diffDays,
    }
  }

  return NextResponse.json({
    pendentes: (await anexarKyuDan(supabaseAdmin, pendentesRes.data || [])).map(mapAtleta),
    vencendo: (await anexarKyuDan(supabaseAdmin, vencendoRes.data || [])).map(mapAtleta),
    vencidas: (await anexarKyuDan(supabaseAdmin, vencidasRes.data || [])).map(mapAtleta),
    novas_mes: novasMesRes.count ?? 0,
  })
}
