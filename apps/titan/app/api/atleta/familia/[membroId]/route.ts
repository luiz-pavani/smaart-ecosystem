import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ membroId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { membroId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, any> = {}
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.data_nascimento !== undefined) updates.data_nascimento = body.data_nascimento
  if (body.genero !== undefined) updates.genero = body.genero
  if (body.kyu_dan_id !== undefined) updates.kyu_dan_id = body.kyu_dan_id

  const { data, error } = await supabaseAdmin
    .from('familia_membro')
    .update(updates)
    .eq('id', membroId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { membroId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin.from('familia_membro').delete().eq('id', membroId)
  return NextResponse.json({ ok: true })
}
