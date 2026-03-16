import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ leadId: string }> }

// PATCH — update status or notas
export async function PATCH(req: NextRequest, { params }: Params) {
  const { leadId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) updates.status = body.status
  if (body.notas !== undefined) updates.notas = body.notas
  if (body.telefone !== undefined) updates.telefone = body.telefone
  if (body.email !== undefined) updates.email = body.email

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(updates)
    .eq('id', leadId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — mark as perdido
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { leadId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin
    .from('leads')
    .update({ status: 'perdido', updated_at: new Date().toISOString() })
    .eq('id', leadId)

  return NextResponse.json({ ok: true })
}
