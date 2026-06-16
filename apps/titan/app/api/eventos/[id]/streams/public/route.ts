import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/eventos/[id]/streams/public
 *
 * Lista streams do evento pra página pública de transmissão.
 *
 * Comportamento de segurança crítico:
 *   - Streams com ppv_habilitado=false → url retornada normalmente
 *   - Streams com ppv_habilitado=true:
 *       - Se user autenticado + tem pagamento status='pago' pro stream_id
 *         → url retornada
 *       - Caso contrário → url=null, mas envia ppv_valor pra UI mostrar
 *         o paywall com botão de checkout.
 *
 * Sem o stakeholder_id na sessão, NUNCA revela a URL — paywall server-side
 * impede que alguém copie o link inspecionando o tráfego.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params

  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, publicado')
    .eq('id', eventoId)
    .maybeSingle()
  if (!evento || !evento.publicado) {
    return NextResponse.json({ error: 'Evento não disponível' }, { status: 404 })
  }

  const { data: streams } = await supabaseAdmin
    .from('event_streams')
    .select('id, area_id, titulo, tipo, stream_url, status, viewers_count, ppv_habilitado, ppv_valor')
    .eq('evento_id', eventoId)
    .order('area_id', { ascending: true })

  if (!streams || streams.length === 0) {
    return NextResponse.json({ evento: { id: evento.id, nome: evento.nome }, streams: [] })
  }

  // Resolve user pra checar PPV unlocks
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let unlockedSet = new Set<string>()
  if (user) {
    const ppvStreamIds = streams.filter(s => s.ppv_habilitado).map(s => s.id)
    if (ppvStreamIds.length > 0) {
      const { data: pagamentos } = await supabaseAdmin
        .from('pagamentos')
        .select('referencia_id')
        .eq('stakeholder_id', user.id)
        .eq('referencia_tipo', 'ppv')
        .in('referencia_id', ppvStreamIds)
        .eq('status', 'pago')
      unlockedSet = new Set((pagamentos || []).map(p => p.referencia_id))
    }
  }

  const out = streams.map(s => {
    const locked = s.ppv_habilitado && !unlockedSet.has(s.id)
    return {
      id: s.id,
      area_id: s.area_id,
      titulo: s.titulo,
      tipo: s.tipo,
      status: s.status,
      viewers_count: s.viewers_count,
      ppv_habilitado: s.ppv_habilitado,
      ppv_valor: s.ppv_valor,
      // CRÍTICO: só revela URL se não está locked
      stream_url: locked ? null : s.stream_url,
      locked,
    }
  })

  return NextResponse.json({
    evento: { id: evento.id, nome: evento.nome },
    streams: out,
  })
}
