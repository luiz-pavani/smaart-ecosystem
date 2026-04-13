import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Resolve academia_id: from param (master_access) or stakeholder
  let academiaId = req.nextUrl.searchParams.get('academia_id')
  if (!academiaId) {
    const { data: perfil } = await supabaseAdmin
      .from('stakeholders')
      .select('academia_id')
      .eq('id', user.id)
      .maybeSingle()
    academiaId = perfil?.academia_id ?? null
  }
  if (!academiaId) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 403 })

  // Primary source: user_fed_lrsj.academia_id (where most athletes are stored)
  const { data: lrsjRows } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('stakeholder_id, nome_completo, telefone, celular, status_plano, data_expiracao, kyu_dan:kyu_dan_id(kyu_dan, cor_faixa)')
    .eq('academia_id', academiaId)
    .eq('federacao_id', 1)
    .order('nome_completo', { ascending: true })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const MIN_DATE = new Date('2000-01-01')

  const vencendo: object[] = []
  const vencidas: object[] = []
  const sem_data: object[] = []
  const todos: object[] = []

  for (const a of lrsjRows || []) {
    const kd = Array.isArray(a.kyu_dan) ? a.kyu_dan[0] : a.kyu_dan
    const base = {
      id: a.stakeholder_id,
      nome_completo: (a as any).nome_completo,
      telefone: (a as any).telefone || (a as any).celular || null,
      status_plano: (a as any).status_plano || null,
      data_expiracao: (a as any).data_expiracao || null,
      graduacao: (kd as any)?.kyu_dan || null,
      cor_faixa: (kd as any)?.cor_faixa || null,
    }

    if (!base.nome_completo) continue

    if (!base.data_expiracao) {
      const entry = { ...base, dias: null, _grupo: 'sem_data' }
      sem_data.push(entry)
      todos.push(entry)
      continue
    }

    const exp = new Date(base.data_expiracao + 'T12:00:00')
    if (exp < MIN_DATE) {
      const entry = { ...base, dias: null, _grupo: 'sem_data' }
      sem_data.push(entry)
      todos.push(entry)
      continue
    }

    const diffMs = exp.getTime() - today.getTime()
    const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (dias < 0) {
      const entry = { ...base, dias, _grupo: 'vencida' }
      vencidas.push(entry)
      todos.push(entry)
    } else if (dias <= 30) {
      const entry = { ...base, dias, _grupo: 'vencendo' }
      vencendo.push(entry)
      todos.push(entry)
    } else {
      todos.push({ ...base, dias, _grupo: 'valido' })
    }
  }

  return NextResponse.json({
    vencendo,
    vencidas,
    sem_data,
    todos,
    total: (lrsjRows || []).length,
  })
}
