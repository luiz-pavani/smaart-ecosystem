import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: Promise<{ classId: string }> }

// GET: enrolled athletes + all academy athletes for search
export async function GET(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const sp = req.nextUrl.searchParams
  const academiaId = sp.get('academiaId')
  const search = sp.get('search') || ''
  const minAge = sp.get('min_age') ? parseInt(sp.get('min_age')!) : null
  const maxAge = sp.get('max_age') ? parseInt(sp.get('max_age')!) : null
  const minKyuDanId = sp.get('min_kyu_dan_id') ? parseInt(sp.get('min_kyu_dan_id')!) : null
  const maxKyuDanId = sp.get('max_kyu_dan_id') ? parseInt(sp.get('max_kyu_dan_id')!) : null

  // Enrolled athletes
  const { data: enrolled, error: enrollErr } = await supabaseAdmin
    .from('class_enrollments')
    .select('athlete_id, enrolled_at, stakeholder:athlete_id(id, nome_completo)')
    .eq('class_id', classId)
    .eq('is_active', true)

  if (enrollErr) return NextResponse.json({ error: enrollErr.message }, { status: 400 })

  // Available athletes from this academy (for search)
  let query = supabaseAdmin
    .from('user_fed_lrsj')
    .select('stakeholder_id, nome_completo, data_nascimento, kyu_dan_id, kyu_dan:kyu_dan_id(cor_faixa, kyu_dan)')
    .eq('federacao_id', 1)
    .order('nome_completo')
    .limit(50)

  if (academiaId) query = query.eq('academia_id', academiaId)
  if (search) query = query.ilike('nome_completo', `%${search}%`)

  // Graduation filter
  if (minKyuDanId != null) query = query.gte('kyu_dan_id', minKyuDanId)
  if (maxKyuDanId != null) query = query.lte('kyu_dan_id', maxKyuDanId)

  const { data: athletes, error: athErr } = await query
  if (athErr) return NextResponse.json({ error: athErr.message }, { status: 400 })

  // Age filter (computed from data_nascimento)
  const today = new Date()
  const filtered = (athletes || []).filter((a: any) => {
    if (minAge == null && maxAge == null) return true
    if (!a.data_nascimento) return false
    const birth = new Date(a.data_nascimento)
    const age = today.getFullYear() - birth.getFullYear() -
      (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
    if (minAge != null && age < minAge) return false
    if (maxAge != null && age > maxAge) return false
    return true
  })

  const enrolledIds = new Set((enrolled || []).map((e: any) => e.athlete_id))

  return NextResponse.json({
    enrolled: (enrolled || []).map((e: any) => ({
      id: e.athlete_id,
      nome_completo: e.stakeholder?.nome_completo || '',
      enrolled_at: e.enrolled_at,
    })),
    athletes: filtered.map((a: any) => ({
      id: a.stakeholder_id,
      nome_completo: a.nome_completo,
      graduacao: a.kyu_dan ? `${a.kyu_dan.cor_faixa} | ${a.kyu_dan.kyu_dan}` : null,
      enrolled: enrolledIds.has(a.stakeholder_id),
    })),
  })
}

// POST: enroll athlete
export async function POST(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const { athlete_id } = await req.json()
  if (!athlete_id) return NextResponse.json({ error: 'athlete_id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('class_enrollments')
    .upsert({ class_id: classId, athlete_id, is_active: true }, { onConflict: 'class_id,athlete_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update current_enrollment count
  const { count } = await supabaseAdmin
    .from('class_enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('is_active', true)

  await supabaseAdmin.from('classes').update({ current_enrollment: count || 0 }).eq('id', classId)

  return NextResponse.json({ success: true })
}

// DELETE: remove athlete
export async function DELETE(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const { athlete_id } = await req.json()
  if (!athlete_id) return NextResponse.json({ error: 'athlete_id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('class_enrollments')
    .update({ is_active: false })
    .eq('class_id', classId)
    .eq('athlete_id', athlete_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { count } = await supabaseAdmin
    .from('class_enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('is_active', true)

  await supabaseAdmin.from('classes').update({ current_enrollment: count || 0 }).eq('id', classId)

  return NextResponse.json({ success: true })
}
