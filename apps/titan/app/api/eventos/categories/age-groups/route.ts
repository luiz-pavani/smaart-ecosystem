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

// GET — list all age groups with weight class counts
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('event_age_groups')
    .select('*')
    .order('ordem')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count weight classes per age group
  const enriched = await Promise.all(
    (data || []).map(async (ag) => {
      const { count: mascCount } = await supabaseAdmin
        .from('event_weight_classes')
        .select('*', { count: 'exact', head: true })
        .eq('age_group_id', ag.id)
        .eq('genero', 'Masculino')
      const { count: femCount } = await supabaseAdmin
        .from('event_weight_classes')
        .select('*', { count: 'exact', head: true })
        .eq('age_group_id', ag.id)
        .eq('genero', 'Feminino')
      return { ...ag, pesos_masc: mascCount || 0, pesos_fem: femCount || 0 }
    })
  )

  return NextResponse.json({ age_groups: enriched })
}

// POST — create new age group
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await checkAdmin(user.id))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { nome, idade_min, idade_max, tempo_luta_seg, golden_score_seg, intervalo_entre_lutas_seg, modalidade, ordem } = body

  if (!nome || idade_min === undefined) {
    return NextResponse.json({ error: 'nome e idade_min são obrigatórios' }, { status: 400 })
  }

  // Auto-compute ordem if not provided
  let finalOrdem = ordem
  if (!finalOrdem) {
    const { data: last } = await supabaseAdmin
      .from('event_age_groups')
      .select('ordem')
      .order('ordem', { ascending: false })
      .limit(1)
      .maybeSingle()
    finalOrdem = (last?.ordem || 0) + 1
  }

  const { data, error } = await supabaseAdmin
    .from('event_age_groups')
    .insert({
      nome,
      idade_min,
      idade_max: idade_max ?? null,
      tempo_luta_seg: tempo_luta_seg ?? 240,
      golden_score_seg: golden_score_seg ?? null,
      intervalo_entre_lutas_seg: intervalo_entre_lutas_seg ?? 60,
      modalidade: modalidade || 'Judo',
      ordem: finalOrdem,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ age_group: data }, { status: 201 })
}

// PATCH — update age group
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await checkAdmin(user.id))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const allowed = ['nome', 'idade_min', 'idade_max', 'tempo_luta_seg', 'golden_score_seg', 'intervalo_entre_lutas_seg', 'modalidade', 'ordem']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('event_age_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ age_group: data })
}

// DELETE — remove age group (and its weight classes)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!(await checkAdmin(user.id))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  // Check if any event_categories reference this age_group
  const { count } = await supabaseAdmin
    .from('event_categories')
    .select('*', { count: 'exact', head: true })
    .eq('age_group_id', id)

  if ((count || 0) > 0) {
    return NextResponse.json({ error: 'Divisão em uso por categorias de eventos. Remova as categorias primeiro.' }, { status: 400 })
  }

  await supabaseAdmin.from('event_weight_classes').delete().eq('age_group_id', id)
  const { error } = await supabaseAdmin.from('event_age_groups').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
