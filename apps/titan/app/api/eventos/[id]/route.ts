import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

async function getRole(userId: string) {
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role ?? null
}

// GET /api/eventos/[id] — detalhe completo do evento (público para eventos publicados)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: evento, error } = await supabaseAdmin
    .from('eventos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  // Try to get authenticated user (optional)
  let user: { id: string } | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch { /* public access */ }

  // Se não publicado, apenas admin ou criador pode ver
  if (!evento.publicado) {
    if (!user) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    const role = await getRole(user.id)
    if (!ADMIN_ROLES.includes(role) && evento.criado_por !== user.id) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    }
  }

  // Contar inscritos
  const { count } = await supabaseAdmin
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)

  // Contar categorias
  const { count: catCount } = await supabaseAdmin
    .from('event_categories')
    .select('*', { count: 'exact', head: true })
    .eq('evento_id', id)
    .eq('ativo', true)

  // Verificar se o user está inscrito (if authenticated)
  let myReg = null
  if (user) {
    const { data } = await supabaseAdmin
      .from('event_registrations')
      .select('id, status, category_id')
      .eq('event_id', id)
      .eq('atleta_id', user.id)
      .maybeSingle()
    myReg = data
  }

  return NextResponse.json({
    evento,
    total_inscritos: count || 0,
    total_categorias: catCount || 0,
    minha_inscricao: myReg || null,
  })
}

// PATCH /api/eventos/[id] — editar evento
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verificar permissão
  const role = await getRole(user.id)
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('criado_por')
    .eq('id', id)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  if (!ADMIN_ROLES.includes(role) && evento.criado_por !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()

  // Campos permitidos para update
  const allowed = [
    'nome', 'data_evento', 'data_evento_fim', 'hora_inicio', 'hora_fim',
    'local', 'cidade', 'descricao', 'status', 'categoria',
    'limite_inscritos', 'taxa_inscricao', 'valor_inscricao',
    'federacao_id', 'modalidade', 'tipo_evento', 'regulamento',
    'banner_url', 'inscricao_inicio', 'inscricao_fim',
    'num_areas', 'endereco_completo', 'contato_email', 'contato_telefone',
    'publicado', 'config',
  ]

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('eventos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/eventos/[id] — cancelar/excluir evento
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (role !== 'master_access') {
    return NextResponse.json({ error: 'Apenas master_access pode excluir eventos' }, { status: 403 })
  }

  // Verificar se há inscrições confirmadas
  const { count } = await supabaseAdmin
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('status', 'confirmed')

  if ((count || 0) > 0) {
    // Soft delete: muda status para Cancelado
    const { data, error } = await supabaseAdmin
      .from('eventos')
      .update({ status: 'Cancelado', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, cancelado: true })
  }

  // Hard delete se não tem inscrições confirmadas
  const { error } = await supabaseAdmin
    .from('eventos')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
