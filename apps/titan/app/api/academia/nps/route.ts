import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // academia_id: query param (passado pela página client com sessionStorage) ou stakeholder
  let academiaId = req.nextUrl.searchParams.get('academia_id')

  if (!academiaId) {
    const { data: perfil } = await supabaseAdmin
      .from('stakeholders')
      .select('role, academia_id')
      .eq('id', user.id)
      .maybeSingle()

    academiaId = perfil?.academia_id ?? null
    if (!academiaId) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 403 })
  }

  const { data: classes } = await supabaseAdmin
    .from('classes')
    .select('id, name, instructor_name')
    .eq('academy_id', academiaId)
    .eq('is_active', true)
    .order('name')

  if (!classes?.length) return NextResponse.json({ turmas: [], geral: null })

  const classIds = classes.map((c: any) => c.id)

  const { data: ratings } = await supabaseAdmin
    .from('class_ratings')
    .select('class_id, rating, comment, created_at')
    .in('class_id', classIds)
    .order('created_at', { ascending: false })

  const ratingsByClass: Record<string, { ratings: number[]; comments: { text: string; created_at: string }[] }> = {}
  ;(ratings || []).forEach((r: any) => {
    if (!ratingsByClass[r.class_id]) ratingsByClass[r.class_id] = { ratings: [], comments: [] }
    ratingsByClass[r.class_id].ratings.push(r.rating)
    if (r.comment) ratingsByClass[r.class_id].comments.push({ text: r.comment, created_at: r.created_at })
  })

  const turmas = classes.map((c: any) => {
    const data = ratingsByClass[c.id]
    if (!data || data.ratings.length === 0) {
      return {
        id: c.id, name: c.name, instructor_name: c.instructor_name,
        avg: null, total: 0,
        dist: [1,2,3,4,5].map(s => ({ star: s, count: 0 })),
        comments: [],
      }
    }
    const avg = data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length
    return {
      id: c.id,
      name: c.name,
      instructor_name: c.instructor_name,
      avg: parseFloat(avg.toFixed(1)),
      total: data.ratings.length,
      dist: [1,2,3,4,5].map(star => ({ star, count: data.ratings.filter(r => r === star).length })),
      comments: data.comments.slice(0, 5),
    }
  }).sort((a: any, b: any) => b.total - a.total || (b.avg ?? 0) - (a.avg ?? 0))

  const allRatings = (ratings || []).map((r: any) => r.rating as number)
  const geral = allRatings.length > 0 ? {
    avg: parseFloat((allRatings.reduce((s, r) => s + r, 0) / allRatings.length).toFixed(1)),
    total: allRatings.length,
    dist: [1,2,3,4,5].map(star => ({ star, count: allRatings.filter(r => r === star).length })),
  } : null

  return NextResponse.json({ turmas, geral })
}
