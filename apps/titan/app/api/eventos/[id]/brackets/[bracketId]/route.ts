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

// GET /api/eventos/[id]/brackets/[bracketId] — detalhe da chave com slots + matches
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const { bracketId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Bracket with category
  const { data: bracket, error } = await supabaseAdmin
    .from('event_brackets')
    .select(`
      *,
      category:event_categories(id, nome_display, genero, tempo_luta_seg, golden_score_seg)
    `)
    .eq('id', bracketId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bracket) return NextResponse.json({ error: 'Chave não encontrada' }, { status: 404 })

  // Slots with athlete data
  const { data: slots } = await supabaseAdmin
    .from('event_bracket_slots')
    .select(`
      *,
      registration:event_registrations(id, atleta_id, dados_atleta, academia_id)
    `)
    .eq('bracket_id', bracketId)
    .order('rodada', { ascending: true })
    .order('posicao', { ascending: true })

  // Matches with athlete data
  const { data: matches } = await supabaseAdmin
    .from('event_matches')
    .select(`
      *,
      athlete1:event_registrations!event_matches_athlete1_registration_id_fkey(id, atleta_id, dados_atleta, academia_id),
      athlete2:event_registrations!event_matches_athlete2_registration_id_fkey(id, atleta_id, dados_atleta, academia_id),
      winner:event_registrations!event_matches_winner_registration_id_fkey(id, atleta_id, dados_atleta)
    `)
    .eq('bracket_id', bracketId)
    .order('match_number', { ascending: true })

  return NextResponse.json({ bracket, slots: slots || [], matches: matches || [] })
}

// PATCH /api/eventos/[id]/brackets/[bracketId] — atualizar config da chave
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const { bracketId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const allowedFields = ['status', 'area_id', 'ordem_no_dia', 'hora_estimada', 'config']
  const updates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('event_brackets')
    .update(updates)
    .eq('id', bracketId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bracket: data })
}

// DELETE /api/eventos/[id]/brackets/[bracketId] — remover chave específica
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const { bracketId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Check finished matches
  const { count } = await supabaseAdmin
    .from('event_matches')
    .select('*', { count: 'exact', head: true })
    .eq('bracket_id', bracketId)
    .eq('status', 'finished')

  if (count && count > 0) {
    return NextResponse.json({ error: 'Chave possui lutas finalizadas' }, { status: 400 })
  }

  await supabaseAdmin.from('event_matches').delete().eq('bracket_id', bracketId)
  await supabaseAdmin.from('event_bracket_slots').delete().eq('bracket_id', bracketId)
  const { error } = await supabaseAdmin.from('event_brackets').delete().eq('id', bracketId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
