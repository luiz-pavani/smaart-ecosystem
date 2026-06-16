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

  const { data: reg, error } = await supabaseAdmin
    .from('event_registrations')
    .select('id, status, checked_in, checked_in_at, peso_inscricao, checkin_token, atleta_id, category_id, event_id')
    .eq('event_id', eventoId)
    .eq('checkin_token', token)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!reg) return NextResponse.json({ error: 'Comprovante não encontrado' }, { status: 404 })

  const [{ data: atleta }, { data: categoria }, { data: evento }] = await Promise.all([
    reg.atleta_id ? supabaseAdmin
      .from('stakeholders')
      .select('nome_completo')
      .eq('id', reg.atleta_id)
      .maybeSingle() : Promise.resolve({ data: null }),
    reg.category_id ? supabaseAdmin
      .from('event_categories')
      .select('nome_display, genero')
      .eq('id', reg.category_id)
      .maybeSingle() : Promise.resolve({ data: null }),
    supabaseAdmin
      .from('eventos')
      .select('nome, data_evento, local, hora_inicio')
      .eq('id', eventoId)
      .maybeSingle(),
  ])

  return NextResponse.json({
    inscricao: {
      id: reg.id,
      status: reg.status,
      checked_in: reg.checked_in,
      checked_in_at: reg.checked_in_at,
      peso_inscricao: reg.peso_inscricao,
      checkin_token: reg.checkin_token,
      atletas: atleta ? {
        nome: atleta.nome_completo?.split(' ')[0] || '',
        sobrenome: atleta.nome_completo?.split(' ').slice(1).join(' ') || '',
      } : null,
      categories: categoria ? {
        nome: categoria.nome_display,
        peso_min: null,
        peso_max: null,
        genero: categoria.genero,
        faixa_etaria: null,
      } : null,
      eventos: evento,
    },
  })
}
