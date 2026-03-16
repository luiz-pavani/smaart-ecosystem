import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ classId: string }> }

// POST — promote first in waitlist to enrolled
export async function POST(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const athleteId: string | undefined = body.athlete_id

  // Get the target: specific athlete or first in line
  let query = supabaseAdmin
    .from('class_waitlist')
    .select('id, athlete_id, position')
    .eq('class_id', classId)
    .order('position', { ascending: true })
    .limit(1)

  if (athleteId) query = query.eq('athlete_id', athleteId) as any

  const { data: entry } = await query.maybeSingle()
  if (!entry) return NextResponse.json({ error: 'Nenhum na fila' }, { status: 404 })

  // Enroll the athlete
  const { error: enrollErr } = await supabaseAdmin
    .from('class_enrollments')
    .insert({
      class_id: classId,
      athlete_id: (entry as any).athlete_id,
      is_active: true,
      enrolled_at: new Date().toISOString(),
    })

  if (enrollErr && enrollErr.code !== '23505') {
    return NextResponse.json({ error: enrollErr.message }, { status: 500 })
  }

  // Update enrollment count
  await supabaseAdmin.rpc('increment_enrollment' as any, { class_id: classId }).catch(() => {
    supabaseAdmin
      .from('classes')
      .select('current_enrollment')
      .eq('id', classId)
      .single()
      .then(({ data }) => {
        supabaseAdmin.from('classes').update({ current_enrollment: (data?.current_enrollment || 0) + 1 }).eq('id', classId)
      })
  })

  // Remove from waitlist
  await supabaseAdmin.from('class_waitlist').delete().eq('id', (entry as any).id)

  // Reorder remaining
  const { data: remaining } = await supabaseAdmin
    .from('class_waitlist')
    .select('id')
    .eq('class_id', classId)
    .order('position', { ascending: true })

  for (let i = 0; i < (remaining || []).length; i++) {
    await supabaseAdmin
      .from('class_waitlist')
      .update({ position: i + 1 })
      .eq('id', (remaining as any[])[i].id)
  }

  return NextResponse.json({ promoted: (entry as any).athlete_id })
}
