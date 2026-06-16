import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/eventos/[id]/brackets/public
 *
 * Lista chaves públicas (status != draft) de um evento publicado.
 * Sem auth — usado pelo TV mode pra montar rotação.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params

  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, publicado')
    .eq('id', eventoId)
    .maybeSingle()
  if (!evento || !evento.publicado) {
    return NextResponse.json({ error: 'Evento não disponível' }, { status: 404 })
  }

  const { data: brackets } = await supabaseAdmin
    .from('event_brackets')
    .select(`
      id, area_id, ordem_no_dia, hora_estimada, status,
      category:event_categories(id, nome_display, genero)
    `)
    .eq('evento_id', eventoId)
    .neq('status', 'draft')
    .order('area_id', { ascending: true })
    .order('ordem_no_dia', { ascending: true })

  return NextResponse.json(
    { brackets: brackets || [] },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } }
  )
}
