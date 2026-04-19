import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/eventos/[id]/ppv-check — verifica quais streams PPV o user desbloqueou
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ unlocked_stream_ids: [] })

  // Buscar streams PPV do evento
  const { data: streams } = await supabaseAdmin
    .from('event_streams')
    .select('id')
    .eq('evento_id', eventoId)
    .eq('ppv_habilitado', true)

  if (!streams || streams.length === 0) {
    return NextResponse.json({ unlocked_stream_ids: [] })
  }

  const streamIds = streams.map(s => s.id)

  // Verificar pagamentos aprovados para esses streams
  const { data: pagamentos } = await supabaseAdmin
    .from('pagamentos')
    .select('referencia_id')
    .eq('user_id', user.id)
    .eq('referencia_tipo', 'ppv')
    .in('referencia_id', streamIds)
    .eq('status', 'Aprovado')

  const unlocked = (pagamentos || []).map(p => p.referencia_id)

  return NextResponse.json({ unlocked_stream_ids: unlocked })
}
