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

// GET /api/eventos/[id]/scoring/[matchId]/var — listar VARs da luta
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: vars, error } = await supabaseAdmin
    .from('event_match_var')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vars: vars || [] })
}

// POST /api/eventos/[id]/scoring/[matchId]/var — solicitar VAR
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { solicitado_por, motivo, timestamp_luta_seg, video_url } = await req.json()

  // Pause the clock
  await supabaseAdmin
    .from('event_match_scores')
    .update({ clock_running: false })
    .eq('match_id', matchId)

  const { data: varRecord, error } = await supabaseAdmin
    .from('event_match_var')
    .insert({
      match_id: matchId,
      solicitado_por: solicitado_por || 'operador',
      motivo: motivo || null,
      timestamp_luta_seg: timestamp_luta_seg || null,
      video_url: video_url || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ var: varRecord })
}

// PATCH /api/eventos/[id]/scoring/[matchId]/var — atualizar decisão VAR
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { var_id, decisao, observacao } = await req.json()
  if (!var_id) return NextResponse.json({ error: 'var_id obrigatório' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('event_match_var')
    .update({
      decisao: decisao || 'pendente',
      observacao: observacao || null,
    })
    .eq('id', var_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ var: data })
}
