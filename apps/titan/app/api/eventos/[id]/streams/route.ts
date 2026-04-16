import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

// GET /api/eventos/[id]/streams — listar streams (público)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params

  const { data: streams } = await supabaseAdmin
    .from('event_streams')
    .select('id, evento_id, area_id, titulo, tipo, stream_url, status, viewers_count, ppv_habilitado, ppv_valor, config')
    .eq('evento_id', eventoId)
    .order('area_id')

  return NextResponse.json({ streams: streams || [] })
}

// POST /api/eventos/[id]/streams — criar/atualizar stream (admin)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stk } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).maybeSingle()
  if (!stk || !ADMIN_ROLES.includes(stk.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { area_id, titulo, tipo, stream_url, stream_key, status: streamStatus } = body

  if (!area_id) return NextResponse.json({ error: 'area_id obrigatório' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('event_streams')
    .upsert({
      evento_id: eventoId,
      area_id,
      titulo: titulo || `Tatame ${area_id}`,
      tipo: tipo || 'youtube',
      stream_url: stream_url || null,
      stream_key: stream_key || null,
      status: streamStatus || 'offline',
    }, { onConflict: 'evento_id,area_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// PATCH /api/eventos/[id]/streams — atualizar status do stream
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stk } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).maybeSingle()
  if (!stk || !ADMIN_ROLES.includes(stk.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { stream_id, ...fields } = await req.json()
  if (!stream_id) return NextResponse.json({ error: 'stream_id obrigatório' }, { status: 400 })

  const allowed = ['titulo', 'tipo', 'stream_url', 'stream_key', 'status', 'ppv_habilitado', 'ppv_valor', 'config']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }

  const { data, error } = await supabaseAdmin
    .from('event_streams')
    .update(updates)
    .eq('id', stream_id)
    .eq('evento_id', eventoId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/eventos/[id]/streams
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stk } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).maybeSingle()
  if (!stk || !ADMIN_ROLES.includes(stk.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { stream_id } = await req.json()
  if (!stream_id) return NextResponse.json({ error: 'stream_id obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('event_streams')
    .delete()
    .eq('id', stream_id)
    .eq('evento_id', eventoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
