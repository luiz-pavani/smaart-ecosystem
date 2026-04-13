import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function resolveAcademiaId(userId: string, paramId: string | null): Promise<string | null> {
  if (paramId) return paramId
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id')
    .eq('id', userId)
    .maybeSingle()
  return data?.academia_id ?? null
}

// GET — list planos for an academia
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const academiaId = await resolveAcademiaId(user.id, req.nextUrl.searchParams.get('academia_id'))
  if (!academiaId) return NextResponse.json({ error: 'Academia não vinculada' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('academia_planos')
    .select('*')
    .eq('academia_id', academiaId)
    .order('ordem', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ planos: data || [] })
}

// POST — create a new plano
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const academiaId = await resolveAcademiaId(user.id, body.academia_id)
  if (!academiaId) return NextResponse.json({ error: 'Academia não vinculada' }, { status: 400 })

  const {
    nome, descricao, valor, valor_original, periodicidade,
    duracao_meses, max_aulas_semana, beneficios, destaque, ordem,
  } = body

  if (!nome || valor == null) {
    return NextResponse.json({ error: 'nome e valor são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('academia_planos')
    .insert({
      academia_id: academiaId,
      nome,
      descricao: descricao || null,
      valor: Number(valor),
      valor_original: valor_original ? Number(valor_original) : null,
      periodicidade: periodicidade || 'mensal',
      duracao_meses: duracao_meses ? Number(duracao_meses) : null,
      max_aulas_semana: max_aulas_semana ? Number(max_aulas_semana) : null,
      beneficios: beneficios || [],
      destaque: destaque ?? false,
      ordem: ordem ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plano: data })
}

// PUT — update a plano
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  // Clean up numeric fields
  if (updates.valor != null) updates.valor = Number(updates.valor)
  if (updates.valor_original != null) updates.valor_original = Number(updates.valor_original)
  if (updates.duracao_meses != null) updates.duracao_meses = Number(updates.duracao_meses)
  if (updates.max_aulas_semana != null) updates.max_aulas_semana = Number(updates.max_aulas_semana)
  if (updates.ordem != null) updates.ordem = Number(updates.ordem)

  // Remove fields we don't want to update
  delete updates.academia_id
  delete updates.created_at
  delete updates.updated_at

  const { data, error } = await supabaseAdmin
    .from('academia_planos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plano: data })
}

// DELETE — soft delete (toggle ativo)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('academia_planos')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
