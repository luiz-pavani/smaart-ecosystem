import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Params = { params: Promise<{ classId: string }> }

// GET: average rating + total for a class
export async function GET(req: NextRequest, { params }: Params) {
  const { classId } = await params

  const { data, error } = await supabaseAdmin
    .from('class_ratings')
    .select('rating')
    .eq('class_id', classId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const ratings = (data || []).map((r: any) => r.rating)
  const total = ratings.length
  const avg = total > 0 ? ratings.reduce((s: number, r: number) => s + r, 0) / total : null

  const dist = [1, 2, 3, 4, 5].map(star => ({
    star,
    count: ratings.filter((r: number) => r === star).length,
  }))

  return NextResponse.json({ avg, total, dist })
}

// POST: submit or update rating (upsert per athlete+class)
export async function POST(req: NextRequest, { params }: Params) {
  const { classId } = await params
  const { athlete_id, rating, comment } = await req.json()

  if (!athlete_id || !rating) return NextResponse.json({ error: 'athlete_id and rating required' }, { status: 400 })
  if (rating < 1 || rating > 5) return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('class_ratings')
    .upsert({ class_id: classId, athlete_id, rating, comment: comment || null }, { onConflict: 'class_id,athlete_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
