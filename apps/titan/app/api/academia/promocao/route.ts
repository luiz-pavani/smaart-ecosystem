import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// GET — fetch rules + eligible athletes for a given academia
export async function GET(req: NextRequest) {
  const academiaId = req.nextUrl.searchParams.get('academia_id')
  if (!academiaId) return NextResponse.json({ error: 'academia_id required' }, { status: 400 })

  // Fetch rules
  const { data: rules } = await supabaseAdmin
    .from('promotion_rules')
    .select('id, kyu_dan_id, min_checkins, min_months')
    .eq('academia_id', academiaId)
    .order('kyu_dan_id')

  // Fetch athletes with their graduations
  const { data: athletes } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('stakeholder_id, nome_completo, kyu_dan_id, data_ultima_graduacao, status_plano')
    .eq('academia_id', academiaId)
    .eq('status_plano', 'Válido')
    .not('kyu_dan_id', 'is', null)

  // Fetch all checkins for these athletes (within the last 2 years to limit data)
  const athleteIds = (athletes || []).map((a: any) => a.stakeholder_id)
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 2)

  let checkinMap: Record<string, number> = {}
  if (athleteIds.length > 0) {
    const { data: checkins } = await supabaseAdmin
      .from('class_checkins')
      .select('athlete_id')
      .in('athlete_id', athleteIds)
      .gte('checkin_date', cutoff.toISOString().split('T')[0])

    ;(checkins || []).forEach((c: any) => {
      checkinMap[c.athlete_id] = (checkinMap[c.athlete_id] || 0) + 1
    })
  }

  // Fetch kyu_dan map
  const { data: kyuDanList } = await supabaseAdmin.from('kyu_dan').select('id, kyu_dan, cor_faixa')
  const kyuDanMap: Record<number, { kyu_dan: string; cor_faixa: string }> = {}
  ;(kyuDanList || []).forEach((k: any) => { kyuDanMap[k.id] = k })

  const ruleMap: Record<number, { min_checkins: number; min_months: number }> = {}
  ;(rules || []).forEach((r: any) => { ruleMap[r.kyu_dan_id] = r })

  const today = new Date()

  const eligible = (athletes || [])
    .map((a: any) => {
      const rule = ruleMap[a.kyu_dan_id]
      if (!rule) return null

      const checkins = checkinMap[a.stakeholder_id] || 0
      const lastPromo = a.data_ultima_graduacao ? new Date(a.data_ultima_graduacao) : null
      const monthsInGrade = lastPromo
        ? (today.getTime() - lastPromo.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        : 999

      const meetsCheckins = checkins >= rule.min_checkins
      const meetsTime = monthsInGrade >= rule.min_months
      const ready = meetsCheckins && meetsTime

      return {
        stakeholder_id: a.stakeholder_id,
        nome_completo: a.nome_completo,
        kyu_dan_id: a.kyu_dan_id,
        graduacao: kyuDanMap[a.kyu_dan_id] || null,
        next_kyu_dan_id: a.kyu_dan_id + 1,
        next_graduacao: kyuDanMap[a.kyu_dan_id + 1] || null,
        checkins,
        min_checkins: rule.min_checkins,
        months_in_grade: Math.floor(monthsInGrade),
        min_months: rule.min_months,
        meetsCheckins,
        meetsTime,
        ready,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => (b.ready ? 1 : 0) - (a.ready ? 1 : 0))

  return NextResponse.json({ rules: rules || [], eligible })
}

// PUT — upsert promotion rules
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { academia_id, rules } = body

  for (const rule of rules) {
    await supabaseAdmin
      .from('promotion_rules')
      .upsert({
        academia_id,
        kyu_dan_id: rule.kyu_dan_id,
        min_checkins: rule.min_checkins,
        min_months: rule.min_months,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'academia_id,kyu_dan_id' })
  }

  return NextResponse.json({ ok: true })
}

// POST — promote athlete (update kyu_dan_id + data_ultima_graduacao)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { athlete_id, new_kyu_dan_id } = await req.json()

  const { error } = await supabaseAdmin
    .from('user_fed_lrsj')
    .update({
      kyu_dan_id: new_kyu_dan_id,
      data_ultima_graduacao: new Date().toISOString().split('T')[0],
    })
    .eq('stakeholder_id', athlete_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
