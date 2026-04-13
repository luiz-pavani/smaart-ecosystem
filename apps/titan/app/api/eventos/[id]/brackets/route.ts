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

// GET /api/eventos/[id]/brackets — listar chaves do evento
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: brackets, error } = await supabaseAdmin
    .from('event_brackets')
    .select(`
      *,
      category:event_categories(id, nome_display, genero, tempo_luta_seg, golden_score_seg)
    `)
    .eq('evento_id', eventoId)
    .order('area_id', { ascending: true })
    .order('ordem_no_dia', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count matches and finished matches per bracket
  const enriched = await Promise.all(
    (brackets || []).map(async (b) => {
      const { count: totalMatches } = await supabaseAdmin
        .from('event_matches')
        .select('*', { count: 'exact', head: true })
        .eq('bracket_id', b.id)
        .neq('status', 'walkover')

      const { count: finishedMatches } = await supabaseAdmin
        .from('event_matches')
        .select('*', { count: 'exact', head: true })
        .eq('bracket_id', b.id)
        .eq('status', 'finished')

      const { count: totalAthletes } = await supabaseAdmin
        .from('event_bracket_slots')
        .select('*', { count: 'exact', head: true })
        .eq('bracket_id', b.id)
        .eq('is_bye', false)

      return {
        ...b,
        total_matches: totalMatches || 0,
        finished_matches: finishedMatches || 0,
        total_athletes: totalAthletes || 0,
      }
    })
  )

  return NextResponse.json({ brackets: enriched })
}

// DELETE /api/eventos/[id]/brackets — remover chave
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { bracket_id } = await req.json()
  if (!bracket_id) return NextResponse.json({ error: 'bracket_id obrigatório' }, { status: 400 })

  // Check if bracket has finished matches
  const { count } = await supabaseAdmin
    .from('event_matches')
    .select('*', { count: 'exact', head: true })
    .eq('bracket_id', bracket_id)
    .eq('status', 'finished')

  if (count && count > 0) {
    return NextResponse.json({ error: 'Chave possui lutas finalizadas. Não é possível remover.' }, { status: 400 })
  }

  // Delete cascade: matches → slots → bracket
  await supabaseAdmin.from('event_matches').delete().eq('bracket_id', bracket_id)
  await supabaseAdmin.from('event_bracket_slots').delete().eq('bracket_id', bracket_id)
  const { error } = await supabaseAdmin.from('event_brackets').delete().eq('id', bracket_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
