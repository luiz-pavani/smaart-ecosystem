import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let academiaId = req.nextUrl.searchParams.get('academia_id')

  if (!academiaId) {
    const { data: perfil } = await supabaseAdmin
      .from('stakeholders')
      .select('academia_id')
      .eq('id', user.id)
      .maybeSingle()
    academiaId = perfil?.academia_id ?? null
    if (!academiaId) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 403 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)
  const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0]

  // Run all queries in parallel
  const [
    academiaRes,
    atletasRes,
    classesRes,
    checkinsRes,
    ratingsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('academias')
      .select('nome, cidade, estado')
      .eq('id', academiaId)
      .maybeSingle(),

    supabaseAdmin
      .from('user_fed_lrsj')
      .select('id, nome_completo, status_membro, status_plano, data_expiracao, kyu_dan:kyu_dan_id(cor_faixa, nome)')
      .eq('academia_id', academiaId)
      .eq('federacao_id', 1)
      .order('nome_completo'),

    supabaseAdmin
      .from('classes')
      .select('id, name, instructor_name')
      .eq('academy_id', academiaId)
      .eq('is_active', true)
      .order('name'),

    supabaseAdmin
      .from('class_checkins')
      .select('athlete_id, class_id, checkin_date, class:class_id(name)')
      .eq('academy_id', academiaId)
      .gte('checkin_date', thirtyDaysStr),

    supabaseAdmin
      .from('class_ratings')
      .select('rating')
      .in(
        'class_id',
        // We'll filter after fetching classes
        ['placeholder']
      ),
  ])

  const academia = academiaRes.data
  const atletas = atletasRes.data || []
  const classes = classesRes.data || []

  // Checkins
  const checkins = checkinsRes.data || []

  // NPS from classes of this academy
  const classIds = classes.map((c: any) => c.id)
  let npsAvg: number | null = null
  let npsTotal = 0
  if (classIds.length > 0) {
    const { data: ratings } = await supabaseAdmin
      .from('class_ratings')
      .select('rating')
      .in('class_id', classIds)
    if (ratings && ratings.length > 0) {
      npsTotal = ratings.length
      npsAvg = parseFloat(
        (ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length).toFixed(1)
      )
    }
  }

  // Checkins por turma
  const checkinsByClass: Record<string, { name: string; count: number; unique: Set<string> }> = {}
  for (const c of checkins) {
    const classData = Array.isArray((c as any).class) ? (c as any).class[0] : (c as any).class
    const name = classData?.name || 'Desconhecida'
    const cid = (c as any).class_id
    if (!checkinsByClass[cid]) checkinsByClass[cid] = { name, count: 0, unique: new Set() }
    checkinsByClass[cid].count++
    checkinsByClass[cid].unique.add((c as any).athlete_id)
  }

  const porTurma = Object.values(checkinsByClass)
    .map(t => ({ name: t.name, checkins: t.count, atletas_unicos: t.unique.size }))
    .sort((a, b) => b.checkins - a.checkins)

  // Checkins por dia da semana
  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const porDiaSemana = DAYS.map((label, dow) => ({
    label,
    count: checkins.filter((c: any) => {
      const d = new Date(c.checkin_date + 'T12:00:00')
      return d.getDay() === dow
    }).length,
  }))

  // Atletas com checkins count
  const checkinsByAthlete: Record<string, number> = {}
  for (const c of checkins) {
    const aid = (c as any).athlete_id
    checkinsByAthlete[aid] = (checkinsByAthlete[aid] || 0) + 1
  }

  const atletasReport = atletas.map((a: any) => {
    const kd = Array.isArray(a.kyu_dan) ? a.kyu_dan[0] : a.kyu_dan
    return {
      id: a.id,
      nome_completo: a.nome_completo,
      graduacao: kd?.nome || a.graduacao || '—',
      cor_faixa: kd?.cor_faixa || null,
      status_plano: a.status_plano || '—',
      data_expiracao: a.data_expiracao || null,
      checkins_30d: checkinsByAthlete[a.id] || 0,
    }
  })

  return NextResponse.json({
    academia: academia || { nome: 'Academia', cidade: null, estado: null },
    atletas: atletasReport,
    turmas: classes.map((c: any) => ({ id: c.id, name: c.name, instructor_name: c.instructor_name })),
    por_turma: porTurma,
    por_dia_semana: porDiaSemana,
    nps: { avg: npsAvg, total: npsTotal },
    periodo_dias: 30,
    total_checkins: checkins.length,
    gerado_em: now.toISOString(),
  })
}
