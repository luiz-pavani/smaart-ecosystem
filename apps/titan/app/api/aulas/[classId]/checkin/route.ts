import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ classId: string }> }

// GET — list checkins for a specific date (default: today)
export async function GET(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]

  const { data } = await supabaseAdmin
    .from('class_checkins')
    .select('id, athlete_id, checked_in_at')
    .eq('class_id', classId)
    .eq('checkin_date', date)
    .order('checked_in_at', { ascending: true })

  const athleteIds = (data || []).map((c: any) => c.athlete_id)
  let nameMap: Record<string, string> = {}
  if (athleteIds.length > 0) {
    const { data: feds } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select('stakeholder_id, nome_completo')
      .in('stakeholder_id', athleteIds)
    ;(feds || []).forEach((f: any) => { nameMap[f.stakeholder_id] = f.nome_completo })
  }

  const checkins = (data || []).map((c: any) => ({
    id: c.id,
    athlete_id: c.athlete_id,
    nome_completo: nameMap[c.athlete_id] || '—',
    checked_in_at: c.checked_in_at,
  }))

  return NextResponse.json({ checkins, date })
}

// POST — check-in (athlete self, or professor/admin on behalf of athlete)
export async function POST(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const date: string = body.date || new Date().toISOString().split('T')[0]

  // Detect if caller is staff (can check in on behalf of athlete)
  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isStaff = ['master_access', 'federacao_admin', 'academia_admin', 'academia_staff', 'professor'].includes(perfil?.role ?? '')

  let athleteId: string
  if (isStaff && body.athlete_id) {
    athleteId = body.athlete_id // manual check-in on behalf of athlete
  } else {
    athleteId = user.id
    // Verify athlete is enrolled when self-checking
    const { data: enrollment } = await supabaseAdmin
      .from('class_enrollments')
      .select('id')
      .eq('class_id', classId)
      .eq('athlete_id', athleteId)
      .eq('is_active', true)
      .maybeSingle()
    if (!enrollment) {
      return NextResponse.json({ error: 'Atleta não matriculado nesta turma' }, { status: 403 })
    }
  }

  const { data: classData } = await supabaseAdmin
    .from('classes')
    .select('academy_id')
    .eq('id', classId)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from('class_checkins')
    .insert({
      class_id: classId,
      athlete_id: athleteId,
      checkin_date: date,
      academy_id: classData?.academy_id ?? null,
    })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ already: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Award points for check-in (fire-and-forget)
  if (classData?.academy_id) {
    supabaseAdmin.from('pontos_atleta').insert({
      athlete_id: athleteId,
      academia_id: classData.academy_id,
      tipo: 'checkin',
      pontos: 10,
      descricao: 'Check-in na aula',
      ref_id: classId,
    }).then(() => {})
  }

  return NextResponse.json({ ok: true })
}

// DELETE — remove a check-in (staff only, to correct errors)
export async function DELETE(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isStaff = ['master_access', 'federacao_admin', 'academia_admin', 'academia_staff', 'professor'].includes(perfil?.role ?? '')
  if (!isStaff) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const athleteId: string = body.athlete_id
  const date: string = body.date || new Date().toISOString().split('T')[0]

  if (!athleteId) return NextResponse.json({ error: 'athlete_id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('class_checkins')
    .delete()
    .eq('class_id', classId)
    .eq('athlete_id', athleteId)
    .eq('checkin_date', date)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
