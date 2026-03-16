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

// POST — athlete checks in
export async function POST(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const date: string = body.date || new Date().toISOString().split('T')[0]

  // Verify athlete is enrolled
  const { data: enrollment } = await supabaseAdmin
    .from('class_enrollments')
    .select('id')
    .eq('class_id', classId)
    .eq('athlete_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!enrollment) {
    return NextResponse.json({ error: 'Atleta não matriculado nesta turma' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('class_checkins')
    .insert({ class_id: classId, athlete_id: user.id, checkin_date: date })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ already: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Award points for check-in (fire-and-forget)
  const { data: classData } = await supabaseAdmin
    .from('classes')
    .select('academy_id')
    .eq('id', classId)
    .maybeSingle()
  if (classData?.academy_id) {
    supabaseAdmin.from('pontos_atleta').insert({
      athlete_id: user.id,
      academia_id: classData.academy_id,
      tipo: 'checkin',
      pontos: 10,
      descricao: 'Check-in na aula',
      ref_id: classId,
    }).then(() => {})
  }

  return NextResponse.json({ ok: true })
}
