import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

/**
 * GET /api/eventos/[id]/streams/youtube-status
 *
 * Retorna se o evento tem canal YouTube conectado + info do canal.
 * Não expõe access_token nem refresh_token (campos sensíveis).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stake } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!ADMIN_ROLES.includes(stake?.role ?? '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: tokens } = await supabaseAdmin
    .from('event_streams_youtube_tokens')
    .select('channel_id, channel_title, connected_at, scope')
    .eq('evento_id', eventoId)
    .maybeSingle()

  return NextResponse.json({
    connected: !!tokens,
    channel_id: tokens?.channel_id || null,
    channel_title: tokens?.channel_title || null,
    connected_at: tokens?.connected_at || null,
    scope: tokens?.scope || null,
  })
}
