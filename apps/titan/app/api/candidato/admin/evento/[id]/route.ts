import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: st } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
  if (!st) return null
  if (['master_access','federacao_admin','admin'].includes(st.role)) return user
  return null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('federation_schedule')
    .update({
      title: body.title,
      description: body.description || null,
      date: body.date,
      start_time: body.start_time || null,
      location: body.location || null,
      type: body.type || null,
      graduation_level: body.graduation_level || [],
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ evento: data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { error } = await supabaseAdmin.from('federation_schedule').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
