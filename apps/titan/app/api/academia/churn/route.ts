import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Calcula risco de churn para atletas ATIVOS de uma academia
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const academiaId = req.nextUrl.searchParams.get('academia_id')
  if (!academiaId) return NextResponse.json({ error: 'academia_id required' }, { status: 400 })

  const today = new Date()
  const d30 = new Date(today); d30.setDate(today.getDate() - 30)
  const d60 = new Date(today); d60.setDate(today.getDate() - 60)

  const d30str = d30.toISOString().split('T')[0]
  const d60str = d60.toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  // Atletas ativos na academia
  const { data: atletas } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('stakeholder_id, nome_completo, telefone, kyu_dan_id, data_ultima_graduacao')
    .eq('academia_id', academiaId)
    .eq('status_plano', 'Válido')
    .not('stakeholder_id', 'is', null)

  if (!atletas?.length) return NextResponse.json({ churn: [] })

  const ids = atletas.map((a: any) => a.stakeholder_id)

  // Check-ins: últimos 30 dias
  const { data: recent } = await supabaseAdmin
    .from('class_checkins')
    .select('athlete_id')
    .in('athlete_id', ids)
    .gte('checkin_date', d30str)
    .lte('checkin_date', todayStr)

  // Check-ins: 30-60 dias atrás
  const { data: previous } = await supabaseAdmin
    .from('class_checkins')
    .select('athlete_id')
    .in('athlete_id', ids)
    .gte('checkin_date', d60str)
    .lt('checkin_date', d30str)

  const recentMap: Record<string, number> = {}
  const prevMap: Record<string, number> = {}
  ;(recent || []).forEach((c: any) => { recentMap[c.athlete_id] = (recentMap[c.athlete_id] || 0) + 1 })
  ;(previous || []).forEach((c: any) => { prevMap[c.athlete_id] = (prevMap[c.athlete_id] || 0) + 1 })

  // Last check-in date
  const { data: lastCheckins } = await supabaseAdmin
    .from('class_checkins')
    .select('athlete_id, checkin_date')
    .in('athlete_id', ids)
    .order('checkin_date', { ascending: false })

  const lastCheckinMap: Record<string, string> = {}
  ;(lastCheckins || []).forEach((c: any) => {
    if (!lastCheckinMap[c.athlete_id]) lastCheckinMap[c.athlete_id] = c.checkin_date
  })

  const churn = atletas
    .map((a: any) => {
      const r = recentMap[a.stakeholder_id] || 0
      const p = prevMap[a.stakeholder_id] || 0
      const lastDate = lastCheckinMap[a.stakeholder_id] || null
      const daysSinceLast = lastDate
        ? Math.floor((today.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999

      // Score de risco (0-100)
      let score = 0
      if (r === 0) score = 90                        // Nenhum treino em 30 dias
      else if (daysSinceLast > 21) score = 75        // Sumiu há 3+ semanas
      else if (daysSinceLast > 14) score = 60        // Sumiu há 2+ semanas
      else if (r < 3) score = 50                    // Muito pouco
      else if (p > 0 && r < p * 0.5) score = 40    // Queda >50%
      else if (p > 0 && r < p * 0.7) score = 25    // Queda moderada
      else score = 0

      if (score === 0) return null // sem risco = não mostrar

      const nivel: 'alto' | 'medio' | 'baixo' =
        score >= 70 ? 'alto' : score >= 40 ? 'medio' : 'baixo'

      return {
        stakeholder_id: a.stakeholder_id,
        nome_completo: a.nome_completo,
        telefone: a.telefone,
        score,
        nivel,
        checkins_recentes: r,
        checkins_anteriores: p,
        dias_desde_ultimo: daysSinceLast === 999 ? null : daysSinceLast,
        ultimo_checkin: lastDate,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 15) // top 15 em risco

  return NextResponse.json({ churn })
}
