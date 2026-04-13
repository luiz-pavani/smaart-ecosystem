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

// GET — list weight classes, optionally filtered by age_group_id
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ageGroupId = req.nextUrl.searchParams.get('age_group_id')

  let query = supabaseAdmin
    .from('event_weight_classes')
    .select('*')
    .order('genero')
    .order('ordem')

  if (ageGroupId) query = query.eq('age_group_id', ageGroupId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ weight_classes: data || [] })
}

// POST — create weight class
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await checkAdmin(user.id))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { age_group_id, genero, nome, peso_min, peso_max, ordem } = body

  if (!age_group_id || !genero || !nome) {
    return NextResponse.json({ error: 'age_group_id, genero e nome são obrigatórios' }, { status: 400 })
  }

  let finalOrdem = ordem
  if (!finalOrdem) {
    const { data: last } = await supabaseAdmin
      .from('event_weight_classes')
      .select('ordem')
      .eq('age_group_id', age_group_id)
      .eq('genero', genero)
      .order('ordem', { ascending: false })
      .limit(1)
      .maybeSingle()
    finalOrdem = (last?.ordem || 0) + 1
  }

  const { data, error } = await supabaseAdmin
    .from('event_weight_classes')
    .insert({
      age_group_id,
      genero,
      nome,
      peso_min: peso_min ?? null,
      peso_max: peso_max ?? null,
      ordem: finalOrdem,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ weight_class: data }, { status: 201 })
}

// PATCH — update weight class
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await checkAdmin(user.id))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const allowed = ['nome', 'peso_min', 'peso_max', 'genero', 'ordem']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }

  const { data, error } = await supabaseAdmin
    .from('event_weight_classes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ weight_class: data })
}

// DELETE — remove weight class
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await checkAdmin(user.id))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('event_weight_classes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
