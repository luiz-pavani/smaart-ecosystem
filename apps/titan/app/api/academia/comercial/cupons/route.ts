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

// GET — list cupons for an academia
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const academiaId = await resolveAcademiaId(user.id, req.nextUrl.searchParams.get('academia_id'))
  if (!academiaId) return NextResponse.json({ error: 'Academia não vinculada' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('academia_cupons')
    .select('*')
    .eq('academia_id', academiaId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cupons: data || [] })
}

// POST — create a new cupom
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const academiaId = await resolveAcademiaId(user.id, body.academia_id)
  if (!academiaId) return NextResponse.json({ error: 'Academia não vinculada' }, { status: 400 })

  const {
    codigo, descricao, tipo_desconto, valor_desconto,
    valor_minimo, plano_ids, uso_maximo,
    validade_inicio, validade_fim,
  } = body

  if (!codigo || valor_desconto == null) {
    return NextResponse.json({ error: 'codigo e valor_desconto são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('academia_cupons')
    .insert({
      academia_id: academiaId,
      codigo: codigo.toUpperCase().trim(),
      descricao: descricao || null,
      tipo_desconto: tipo_desconto || 'percentual',
      valor_desconto: Number(valor_desconto),
      valor_minimo: valor_minimo ? Number(valor_minimo) : null,
      plano_ids: plano_ids || null,
      uso_maximo: uso_maximo ? Number(uso_maximo) : null,
      validade_inicio: validade_inicio || null,
      validade_fim: validade_fim || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Já existe um cupom com este código nesta academia' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ cupom: data })
}

// PUT — update a cupom
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  if (updates.valor_desconto != null) updates.valor_desconto = Number(updates.valor_desconto)
  if (updates.valor_minimo != null) updates.valor_minimo = Number(updates.valor_minimo)
  if (updates.uso_maximo != null) updates.uso_maximo = Number(updates.uso_maximo)
  if (updates.codigo) updates.codigo = updates.codigo.toUpperCase().trim()

  delete updates.academia_id
  delete updates.created_at
  delete updates.updated_at
  delete updates.uso_atual

  const { data, error } = await supabaseAdmin
    .from('academia_cupons')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Já existe um cupom com este código' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ cupom: data })
}

// DELETE — remove cupom
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('academia_cupons')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
