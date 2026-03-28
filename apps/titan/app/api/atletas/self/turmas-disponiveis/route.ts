import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Buscar academia do atleta
  const { data: stakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!stakeholder?.academia_id) {
    return NextResponse.json({ classes: [], semAcademia: true })
  }

  // Turmas ativas da academia + matrícula ativa atual
  const [classesRes, enrolledRes, requestsRes] = await Promise.all([
    supabaseAdmin
      .from('classes')
      .select('id, name, instructor_name, location, capacity, current_enrollment, class_schedules(day_of_week, start_time, end_time)')
      .eq('academy_id', stakeholder.academia_id)
      .eq('is_active', true)
      .order('name'),
    supabaseAdmin
      .from('class_enrollments')
      .select('class_id')
      .eq('athlete_id', user.id)
      .eq('is_active', true),
    supabaseAdmin
      .from('enrollment_requests')
      .select('class_id, status')
      .eq('athlete_id', user.id),
  ])

  const enrolledIds = new Set((enrolledRes.data || []).map((e: any) => e.class_id))
  const requestMap: Record<string, string> = {}
  ;(requestsRes.data || []).forEach((r: any) => { requestMap[r.class_id] = r.status })

  const classes = (classesRes.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    instructor_name: c.instructor_name,
    location: c.location,
    capacity: c.capacity,
    current_enrollment: c.current_enrollment,
    is_full: c.capacity != null && c.current_enrollment >= c.capacity,
    schedules: (c.class_schedules || []).sort((a: any, b: any) => a.day_of_week - b.day_of_week),
    enrolled: enrolledIds.has(c.id),
    request_status: requestMap[c.id] ?? null,
  }))

  return NextResponse.json({ classes, today: new Date().toISOString().split('T')[0] })
}
