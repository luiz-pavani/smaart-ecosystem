import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const dias = parseInt(req.nextUrl.searchParams.get('dias') || '90', 10)

  const inicio = new Date()
  inicio.setDate(inicio.getDate() - dias)
  const inicioStr = inicio.toISOString().split('T')[0]
  const hojeStr = new Date().toISOString().split('T')[0]

  const { data: checkins } = await supabaseAdmin
    .from('class_checkins')
    .select('checkin_date, checked_in_at, class_id')
    .eq('athlete_id', user.id)
    .gte('checkin_date', inicioStr)
    .lte('checkin_date', hojeStr)
    .order('checkin_date', { ascending: false })

  if (!checkins?.length) {
    return NextResponse.json({
      checkins: [],
      stats: { total: 0, semana: 0, media_semana: 0, streak: 0, melhor_streak: 0 },
      por_dia: {},
      por_turma: [],
      periodo: { inicio: inicioStr, fim: hojeStr, dias },
    })
  }

  // Nomes das turmas
  const classIds = [...new Set(checkins.map((c: any) => c.class_id).filter(Boolean))]
  const { data: classes } = classIds.length
    ? await supabaseAdmin.from('classes').select('id, name').in('id', classIds)
    : { data: [] }

  const classMap: Record<string, string> = {}
  ;(classes || []).forEach((c: any) => { classMap[c.id] = c.name })

  // Mapa de dias com treino
  const porDia: Record<string, string[]> = {}
  const porTurmaCount: Record<string, number> = {}

  checkins.forEach((c: any) => {
    if (!porDia[c.checkin_date]) porDia[c.checkin_date] = []
    const nome = classMap[c.class_id] || 'Treino'
    porDia[c.checkin_date].push(nome)
    porTurmaCount[nome] = (porTurmaCount[nome] || 0) + 1
  })

  const diasComTreino = Object.keys(porDia)

  // Treinos na última semana
  const semanaAtras = new Date()
  semanaAtras.setDate(semanaAtras.getDate() - 7)
  const semanaAtrasStr = semanaAtras.toISOString().split('T')[0]
  const semana = diasComTreino.filter(d => d >= semanaAtrasStr).length

  // Média por semana
  const mediasSemana = checkins.length / Math.max(dias / 7, 1)

  // Streak atual (dias consecutivos até hoje)
  const sortedDays = [...diasComTreino].sort((a, b) => b.localeCompare(a))
  let streak = 0
  let melhorStreak = 0
  let current = new Date(hojeStr)

  for (const day of sortedDays) {
    const dayDate = new Date(day + 'T12:00:00')
    const diff = Math.round((current.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diff <= 1) {
      streak++
      current = dayDate
    } else {
      break
    }
  }

  // Melhor streak (percorre todos os dias ordenados asc)
  const allDaysSorted = [...diasComTreino].sort()
  let tempStreak = 0
  for (let i = 0; i < allDaysSorted.length; i++) {
    if (i === 0) { tempStreak = 1; continue }
    const prev = new Date(allDaysSorted[i - 1] + 'T12:00:00')
    const curr = new Date(allDaysSorted[i] + 'T12:00:00')
    const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) { tempStreak++ } else { tempStreak = 1 }
    melhorStreak = Math.max(melhorStreak, tempStreak)
  }
  melhorStreak = Math.max(melhorStreak, streak)

  // Top turmas
  const porTurma = Object.entries(porTurmaCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Lista dos últimos 30 check-ins
  const lista = checkins.slice(0, 30).map((c: any) => ({
    data: c.checkin_date,
    turma: classMap[c.class_id] || 'Treino',
    hora: c.checked_in_at
      ? new Date(c.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : null,
  }))

  return NextResponse.json({
    checkins: lista,
    stats: {
      total: checkins.length,
      semana,
      media_semana: parseFloat(mediasSemana.toFixed(1)),
      streak,
      melhor_streak: melhorStreak,
    },
    por_dia: porDia,
    por_turma: porTurma,
    periodo: { inicio: inicioStr, fim: hojeStr, dias },
  })
}
