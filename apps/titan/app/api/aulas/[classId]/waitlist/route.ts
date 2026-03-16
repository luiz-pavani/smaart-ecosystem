import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ classId: string }> }

// GET — list waitlist (admin: all; athlete: own position)
export async function GET(_req: NextRequest, { params }: Params) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('class_waitlist')
    .select('id, athlete_id, position, created_at')
    .eq('class_id', classId)
    .order('position', { ascending: true })

  // Enrich with names
  const athleteIds = (data || []).map((w: any) => w.athlete_id)
  let nameMap: Record<string, string> = {}
  if (athleteIds.length > 0) {
    const { data: feds } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select('stakeholder_id, nome_completo')
      .in('stakeholder_id', athleteIds)
    ;(feds || []).forEach((f: any) => { nameMap[f.stakeholder_id] = f.nome_completo })
  }

  const list = (data || []).map((w: any) => ({
    id: w.id,
    athlete_id: w.athlete_id,
    nome_completo: nameMap[w.athlete_id] || '—',
    position: w.position,
    created_at: w.created_at,
    is_me: w.athlete_id === user.id,
  }))

  return NextResponse.json({ waitlist: list })
}

// POST — add athlete to waitlist
export async function POST(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const athleteId: string = body.athlete_id || user.id

  // Get next position
  const { data: last } = await supabaseAdmin
    .from('class_waitlist')
    .select('position')
    .eq('class_id', classId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const position = (last?.position ?? 0) + 1

  const { error } = await supabaseAdmin
    .from('class_waitlist')
    .insert({ class_id: classId, athlete_id: athleteId, position })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Já está na fila' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ position })
}

// DELETE — remove from waitlist
export async function DELETE(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const athleteId: string = body.athlete_id || user.id

  await supabaseAdmin
    .from('class_waitlist')
    .delete()
    .eq('class_id', classId)
    .eq('athlete_id', athleteId)

  // Reorder remaining positions
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

  return NextResponse.json({ ok: true })
}
