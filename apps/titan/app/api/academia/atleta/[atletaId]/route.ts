import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ atletaId: string }> }

// GET — athlete detail: checkins by month + points summary
export async function GET(req: NextRequest, { params }: Params) {
  const { atletaId } = await params
  const academiaId = req.nextUrl.searchParams.get('academia_id')

  // Checkins (last 24 months)
  const since = new Date()
  since.setMonth(since.getMonth() - 24)

  const { data: checkins } = await supabaseAdmin
    .from('class_checkins')
    .select('checkin_date')
    .eq('athlete_id', atletaId)
    .gte('checkin_date', since.toISOString().split('T')[0])
    .order('checkin_date', { ascending: false })

  // Group by month
  const monthMap: Record<string, number> = {}
  ;(checkins || []).forEach((c: any) => {
    const month = c.checkin_date.slice(0, 7) // YYYY-MM
    monthMap[month] = (monthMap[month] || 0) + 1
  })

  const checkinsByMonth = Object.entries(monthMap)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month))

  const totalCheckins = (checkins || []).length

  // Points summary
  const pointsQuery = supabaseAdmin
    .from('pontos_atleta')
    .select('id, tipo, pontos, descricao, created_at')
    .eq('athlete_id', atletaId)
    .order('created_at', { ascending: false })

  if (academiaId) (pointsQuery as any).eq('academia_id', academiaId)

  const { data: points } = await pointsQuery

  const totalPoints = (points || []).reduce((sum: number, p: any) => sum + p.pontos, 0)
  const offsetPoints = (points || [])
    .filter((p: any) => p.tipo === 'offset')
    .reduce((sum: number, p: any) => sum + p.pontos, 0)

  return NextResponse.json({
    totalCheckins,
    checkinsByMonth,
    totalPoints,
    offsetPoints,
    pointsHistory: (points || []).slice(0, 20),
  })
}

// PATCH — update data_ultima_graduacao
export async function PATCH(req: NextRequest, { params }: Params) {
  const { atletaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data_ultima_graduacao } = await req.json()
  if (!data_ultima_graduacao) {
    return NextResponse.json({ error: 'data_ultima_graduacao obrigatória' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('user_fed_lrsj')
    .update({ data_ultima_graduacao })
    .eq('stakeholder_id', atletaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// POST — add offset points
export async function POST(req: NextRequest, { params }: Params) {
  const { atletaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { academia_id, pontos, descricao } = await req.json()

  if (!academia_id || !pontos) {
    return NextResponse.json({ error: 'academia_id e pontos são obrigatórios' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('pontos_atleta').insert({
    athlete_id: atletaId,
    academia_id,
    tipo: 'offset',
    pontos: Number(pontos),
    descricao: descricao || `Ajuste histórico: ${pontos} presenças`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove an offset entry by id
export async function DELETE(req: NextRequest, { params }: Params) {
  const { atletaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pontosId = req.nextUrl.searchParams.get('id')
  if (!pontosId) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('pontos_atleta')
    .delete()
    .eq('id', pontosId)
    .eq('athlete_id', atletaId)
    .eq('tipo', 'offset')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
