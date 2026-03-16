import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

// GET: enrolled turmas for athlete + all turmas from academy
export async function GET(req: NextRequest, { params }: Params) {
  const { id: athleteId } = await params
  const academiaId = req.nextUrl.searchParams.get('academiaId')

  // Classes athlete is enrolled in
  const { data: enrollments } = await supabaseAdmin
    .from('class_enrollments')
    .select('class_id')
    .eq('athlete_id', athleteId)
    .eq('is_active', true)

  const enrolledIds = new Set((enrollments || []).map((e: any) => e.class_id))

  // All active classes from this academy
  let query = supabaseAdmin
    .from('classes')
    .select('id, name, class_schedules(day_of_week, start_time, end_time)')
    .eq('is_active', true)
    .order('name')

  if (academiaId) query = query.eq('academy_id', academiaId)

  const { data: allClasses } = await query

  const enrolled = (allClasses || [])
    .filter((c: any) => enrolledIds.has(c.id))
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      schedules: c.class_schedules || [],
    }))

  const all = (allClasses || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    enrolled: enrolledIds.has(c.id),
  }))

  return NextResponse.json({ enrolled, all })
}
