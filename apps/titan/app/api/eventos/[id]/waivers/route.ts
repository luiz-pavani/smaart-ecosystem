import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

// GET /api/eventos/[id]/waivers — listar termos do evento
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params

  const { data: waivers } = await supabaseAdmin
    .from('event_waivers')
    .select('*')
    .eq('evento_id', eventoId)
    .eq('ativo', true)
    .order('ordem')

  return NextResponse.json({ waivers: waivers || [] })
}

// POST /api/eventos/[id]/waivers — criar termo (admin)
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

  const { titulo, conteudo, obrigatorio, ordem } = await req.json()
  if (!titulo || !conteudo) return NextResponse.json({ error: 'titulo e conteudo obrigatórios' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('event_waivers')
    .insert({
      evento_id: eventoId,
      titulo,
      conteudo,
      obrigatorio: obrigatorio ?? true,
      ordem: ordem ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

// PATCH /api/eventos/[id]/waivers — editar termo
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

  const { waiver_id, ...fields } = await req.json()
  if (!waiver_id) return NextResponse.json({ error: 'waiver_id obrigatório' }, { status: 400 })

  const allowed = ['titulo', 'conteudo', 'obrigatorio', 'ordem', 'ativo']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }

  const { data, error } = await supabaseAdmin
    .from('event_waivers')
    .update(updates)
    .eq('id', waiver_id)
    .eq('evento_id', eventoId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/eventos/[id]/waivers — excluir termo
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

  const { waiver_id } = await req.json()
  if (!waiver_id) return NextResponse.json({ error: 'waiver_id obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('event_waivers')
    .delete()
    .eq('id', waiver_id)
    .eq('evento_id', eventoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
