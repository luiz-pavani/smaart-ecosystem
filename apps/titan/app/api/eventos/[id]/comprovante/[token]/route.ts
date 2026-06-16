import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/eventos/[id]/comprovante/[token]
 * Endpoint público — atleta acessa via link no email/WhatsApp ou QR.
 * Retorna info da inscrição + status de credenciamento.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; token: string }> }
) {
  const { id: eventoId, token } = await params
  if (!token || token.length < 8) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('event_registrations')
    .select(`
      id, status, checked_in, checked_in_at, peso_inscricao, checkin_token,
      atletas:atleta_id (nome, sobrenome),
      categories:category_id (nome, peso_min, peso_max, genero, faixa_etaria),
      eventos:event_id (nome, data_evento, local, hora_inicio, num_areas)
    `)
    .eq('event_id', eventoId)
    .eq('checkin_token', token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Comprovante não encontrado' }, { status: 404 })

  return NextResponse.json({ inscricao: data })
}
