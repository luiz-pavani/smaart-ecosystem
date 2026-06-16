import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

/**
 * POST /api/eventos/[id]/streams/youtube-disconnect
 *
 * Remove os tokens YouTube do evento. NÃO deleta broadcasts já criados no
 * canal — eles continuam lá, só perdemos a capacidade de gerenciar via API.
 * Pra deletar broadcasts, use o YouTube Studio diretamente.
 */
export async function POST(
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

  await supabaseAdmin
    .from('event_streams_youtube_tokens')
    .delete()
    .eq('evento_id', eventoId)

  return NextResponse.json({ ok: true })
}
