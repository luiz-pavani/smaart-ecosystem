import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: enrollments } = await supabaseAdmin
    .from('class_enrollments')
    .select('class_id')
    .eq('athlete_id', user.id)
    .eq('is_active', true)

  if (!enrollments?.length) return NextResponse.json({ turmas: [], today: new Date().toISOString().split('T')[0] })

  const classIds = enrollments.map((e: any) => e.class_id)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const d30str = thirtyDaysAgo.toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]

  const [classesRes, checkinsRes, waitlistRes, ratingsRes] = await Promise.all([
    supabaseAdmin
      .from('classes')
      .select('id, name, instructor_name, location, capacity, current_enrollment, class_schedules(day_of_week, start_time, end_time)')
      .in('id', classIds)
      .eq('is_active', true)
      .order('name'),
    supabaseAdmin
      .from('class_checkins')
      .select('class_id, checkin_date')
      .eq('athlete_id', user.id)
      .in('class_id', classIds)
      .gte('checkin_date', d30str)
      .lte('checkin_date', todayStr),
    supabaseAdmin
      .from('class_waitlist')
      .select('class_id, position')
      .eq('athlete_id', user.id)
      .in('class_id', classIds),
    supabaseAdmin
      .from('class_ratings')
      .select('class_id, rating')
      .eq('athlete_id', user.id)
      .in('class_id', classIds),
  ])

  const checkinMap: Record<string, number> = {}
  const lastCheckinMap: Record<string, string> = {}
  ;(checkinsRes.data || []).forEach((c: any) => {
    checkinMap[c.class_id] = (checkinMap[c.class_id] || 0) + 1
    if (!lastCheckinMap[c.class_id] || c.checkin_date > lastCheckinMap[c.class_id]) {
      lastCheckinMap[c.class_id] = c.checkin_date
    }
  })

  const waitlistMap: Record<string, number> = {}
  ;(waitlistRes.data || []).forEach((w: any) => { waitlistMap[w.class_id] = w.position })

  const ratingMap: Record<string, number> = {}
  ;(ratingsRes.data || []).forEach((r: any) => { ratingMap[r.class_id] = r.rating })

  const turmas = (classesRes.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    instructor_name: c.instructor_name,
    location: c.location,
    capacity: c.capacity,
    current_enrollment: c.current_enrollment,
    is_full: c.capacity != null && c.current_enrollment >= c.capacity,
    schedules: (c.class_schedules || []).sort((a: any, b: any) => a.day_of_week - b.day_of_week),
    checkins_30d: checkinMap[c.id] || 0,
    ultimo_checkin: lastCheckinMap[c.id] || null,
    waitlist_position: waitlistMap[c.id] ?? null,
    minha_avaliacao: ratingMap[c.id] ?? null,
  }))

  return NextResponse.json({ turmas, today: todayStr })
}
