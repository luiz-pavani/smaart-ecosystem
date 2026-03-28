import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Fetch athlete's federation record, fallback to stakeholders
  const { data: fedRecord } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('kyu_dan_id, data_ultima_graduacao, academia_id, status_plano')
    .eq('stakeholder_id', user.id)
    .maybeSingle()

  const { data: stakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('kyu_dan_id, academia_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!fedRecord && !stakeholder) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const atleta = {
    kyu_dan_id: fedRecord?.kyu_dan_id ?? stakeholder?.kyu_dan_id ?? null,
    data_ultima_graduacao: fedRecord?.data_ultima_graduacao ?? null,
    academia_id: fedRecord?.academia_id ?? stakeholder?.academia_id ?? null,
    status_plano: fedRecord?.status_plano ?? null,
  }

  // Fetch kyu_dan info
  const { data: kyuDanList } = await supabaseAdmin
    .from('kyu_dan')
    .select('id, kyu_dan, cor_faixa, icones')
    .order('id')

  const kyuDanMap: Record<number, any> = {}
  ;(kyuDanList || []).forEach((k: any) => { kyuDanMap[k.id] = k })

  const currentKd = atleta.kyu_dan_id ? kyuDanMap[atleta.kyu_dan_id] : null
  const nextKd = atleta.kyu_dan_id ? kyuDanMap[atleta.kyu_dan_id + 1] : null

  // Fetch promotion rule for current grade (in athlete's academy)
  let rule: { min_checkins: number; min_months: number } | null = null
  if (atleta.academia_id && atleta.kyu_dan_id) {
    const { data: ruleData } = await supabaseAdmin
      .from('promotion_rules')
      .select('min_checkins, min_months')
      .eq('academia_id', atleta.academia_id)
      .eq('kyu_dan_id', atleta.kyu_dan_id)
      .maybeSingle()
    rule = ruleData || null
  }

  // Count check-ins since last promotion (or last 2 years)
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 2)
  const since = atleta.data_ultima_graduacao
    ? new Date(atleta.data_ultima_graduacao) > cutoff
      ? atleta.data_ultima_graduacao
      : cutoff.toISOString().split('T')[0]
    : cutoff.toISOString().split('T')[0]

  const { count: checkins } = await supabaseAdmin
    .from('class_checkins')
    .select('*', { count: 'exact', head: true })
    .eq('athlete_id', user.id)
    .gte('checkin_date', since)

  // Historical offset (pontos ÷ 10)
  let offsetCheckins = 0
  if (atleta.academia_id) {
    const { data: offsets } = await supabaseAdmin
      .from('pontos_atleta')
      .select('pontos')
      .eq('athlete_id', user.id)
      .eq('academia_id', atleta.academia_id)
      .eq('tipo', 'offset')
    ;(offsets || []).forEach((o: any) => { offsetCheckins += Math.floor(o.pontos / 10) })
  }

  const totalCheckins = (checkins || 0) + offsetCheckins

  // Months in current grade
  const today = new Date()
  const lastPromo = atleta.data_ultima_graduacao ? new Date(atleta.data_ultima_graduacao) : null
  const monthsInGrade = lastPromo
    ? (today.getTime() - lastPromo.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    : 0

  const minCheckins = rule?.min_checkins ?? null
  const minMonths = rule?.min_months ?? null

  const checkinsProgress = minCheckins ? Math.min(100, Math.round((totalCheckins / minCheckins) * 100)) : null
  const timeProgress = minMonths ? Math.min(100, Math.round((monthsInGrade / minMonths) * 100)) : null
  const ready = !!(minCheckins && minMonths && totalCheckins >= minCheckins && monthsInGrade >= minMonths)

  return NextResponse.json({
    kyu_dan_id: atleta.kyu_dan_id,
    status_plano: atleta.status_plano,
    graduacao_atual: currentKd,
    proxima_graduacao: nextKd,
    data_ultima_graduacao: atleta.data_ultima_graduacao,
    checkins: totalCheckins,
    min_checkins: minCheckins,
    checkins_progress: checkinsProgress,
    months_in_grade: Math.floor(monthsInGrade),
    min_months: minMonths,
    time_progress: timeProgress,
    ready,
    has_rules: !!rule,
  })
}
