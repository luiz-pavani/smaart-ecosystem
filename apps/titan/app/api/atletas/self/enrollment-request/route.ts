import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// POST — solicitar matrícula em uma turma
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { class_id } = await req.json()
  if (!class_id) return NextResponse.json({ error: 'class_id obrigatório' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('enrollment_requests')
    .upsert({ class_id, athlete_id: user.id, status: 'pending', requested_at: new Date().toISOString() }, { onConflict: 'class_id,athlete_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE — cancelar solicitação pendente
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { class_id } = await req.json()
  if (!class_id) return NextResponse.json({ error: 'class_id obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('enrollment_requests')
    .delete()
    .eq('class_id', class_id)
    .eq('athlete_id', user.id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
