import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

// POST /api/eventos/[id]/reset
// Resets the event: deletes brackets, matches, scores, registrations, categories
// Keeps the event itself and its basic config
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stk } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!stk || !ADMIN_ROLES.includes(stk.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Get all bracket IDs
  const { data: brackets } = await supabaseAdmin
    .from('event_brackets')
    .select('id')
    .eq('evento_id', eventoId)

  const bracketIds = (brackets || []).map(b => b.id)

  if (bracketIds.length > 0) {
    // Delete match scores
    const { data: matches } = await supabaseAdmin
      .from('event_matches')
      .select('id')
      .in('bracket_id', bracketIds)
    const matchIds = (matches || []).map(m => m.id)

    if (matchIds.length > 0) {
      await supabaseAdmin.from('event_match_scores').delete().in('match_id', matchIds)
      await supabaseAdmin.from('event_match_var').delete().in('match_id', matchIds)
    }

    // Delete matches
    await supabaseAdmin.from('event_matches').delete().in('bracket_id', bracketIds)

    // Delete bracket slots
    await supabaseAdmin.from('event_bracket_slots').delete().in('bracket_id', bracketIds)

    // Delete brackets
    await supabaseAdmin.from('event_brackets').delete().eq('evento_id', eventoId)
  }

  // Delete registrations
  await supabaseAdmin.from('event_registrations').delete().eq('event_id', eventoId)

  // Delete event categories
  await supabaseAdmin.from('event_categories').delete().eq('evento_id', eventoId)

  // Delete results
  await supabaseAdmin.from('event_results').delete().eq('evento_id', eventoId)

  // Reset event config schedule
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('config')
    .eq('id', eventoId)
    .maybeSingle()

  const config = (evento?.config as Record<string, unknown>) || {}
  delete config.category_order
  delete config.schedule_settings

  await supabaseAdmin
    .from('eventos')
    .update({
      config,
      status: 'Planejamento',
    })
    .eq('id', eventoId)

  return NextResponse.json({ ok: true })
}
