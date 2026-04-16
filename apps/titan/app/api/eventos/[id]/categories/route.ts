import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

async function checkAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data && ADMIN_ROLES.includes(data.role)
}

// GET /api/eventos/[id]/categories — listar categorias do evento
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: categories, error } = await supabaseAdmin
    .from('event_categories')
    .select(`
      *,
      age_group:event_age_groups(id, nome, idade_min, idade_max, tempo_luta_seg, golden_score_seg),
      weight_class:event_weight_classes(id, nome, peso_min, peso_max, genero)
    `)
    .eq('evento_id', id)
    .eq('ativo', true)
    .order('genero')
    .order('nome_display')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Contar inscritos por categoria
  const categoryIds = (categories || []).map(c => c.id)
  let inscritosMap: Record<string, number> = {}

  if (categoryIds.length > 0) {
    const { data: counts } = await supabaseAdmin
      .from('event_registrations')
      .select('category_id')
      .eq('event_id', id)
      .in('category_id', categoryIds)

    if (counts) {
      for (const row of counts) {
        if (row.category_id) {
          inscritosMap[row.category_id] = (inscritosMap[row.category_id] || 0) + 1
        }
      }
    }
  }

  const enriched = (categories || []).map(c => ({
    ...c,
    total_inscritos: inscritosMap[c.id] || 0,
  }))

  return NextResponse.json({ categories: enriched })
}

// POST /api/eventos/[id]/categories — criar categoria manualmente
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await checkAdmin(user.id))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { age_group_id, weight_class_id, genero, kyu_dan_min, kyu_dan_max, nome_display, taxa_inscricao, limite_inscritos, tempo_luta_seg, golden_score_seg, modo } = body

  if (!genero || !nome_display) {
    return NextResponse.json({ error: 'genero e nome_display são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('event_categories')
    .insert({
      evento_id: id,
      age_group_id: age_group_id || null,
      weight_class_id: weight_class_id || null,
      genero,
      kyu_dan_min: kyu_dan_min ?? null,
      kyu_dan_max: kyu_dan_max ?? null,
      nome_display,
      taxa_inscricao: taxa_inscricao ?? 0,
      limite_inscritos: limite_inscritos ?? null,
      tempo_luta_seg: tempo_luta_seg ?? 240,
      golden_score_seg: golden_score_seg ?? null,
      modo: modo || 'competitivo',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

// PATCH /api/eventos/[id]/categories — editar categoria
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await checkAdmin(user.id))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { category_id, ...fields } = body
  if (!category_id) return NextResponse.json({ error: 'category_id obrigatório' }, { status: 400 })

  const allowed = ['nome_display', 'genero', 'taxa_inscricao', 'limite_inscritos', 'tempo_luta_seg', 'golden_score_seg', 'intervalo_entre_lutas_seg', 'kyu_dan_min', 'kyu_dan_max', 'ativo', 'age_group_id', 'weight_class_id', 'modo']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('event_categories')
    .update(updates)
    .eq('id', category_id)
    .eq('evento_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/eventos/[id]/categories — excluir categoria (body: { category_id })
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await checkAdmin(user.id))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { category_id } = await req.json()
  if (!category_id) return NextResponse.json({ error: 'category_id obrigatório' }, { status: 400 })

  // Verificar se há inscrições
  const { count } = await supabaseAdmin
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', category_id)

  if ((count || 0) > 0) {
    // Soft delete: desativar
    const { error } = await supabaseAdmin
      .from('event_categories')
      .update({ ativo: false })
      .eq('id', category_id)
      .eq('evento_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, desativada: true })
  }

  const { error } = await supabaseAdmin
    .from('event_categories')
    .delete()
    .eq('id', category_id)
    .eq('evento_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
