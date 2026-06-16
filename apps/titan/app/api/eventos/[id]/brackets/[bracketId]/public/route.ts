import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/eventos/[id]/brackets/[bracketId]/public
 *
 * Endpoint público — bracket detail sem auth, pra TV de espectador.
 * Retorna mesmos campos que /brackets/[bracketId] (privado) mas só
 * quando bracket.status='published' OU 'finished' OU evento publicado.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const { id: eventoId, bracketId } = await params

  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, publicado')
    .eq('id', eventoId)
    .maybeSingle()
  if (!evento || !evento.publicado) {
    return NextResponse.json({ error: 'Evento não disponível' }, { status: 404 })
  }

  const { data: bracket } = await supabaseAdmin
    .from('event_brackets')
    .select(`
      id, tipo, status, num_rodadas, area_id, ordem_no_dia, hora_estimada,
      category:event_categories(id, nome_display, genero, tempo_luta_seg, golden_score_seg)
    `)
    .eq('id', bracketId)
    .eq('evento_id', eventoId)
    .maybeSingle()
  if (!bracket) return NextResponse.json({ error: 'Chave não encontrada' }, { status: 404 })

  if (bracket.status === 'draft') {
    // Chaves em rascunho ainda não devem aparecer publicamente
    return NextResponse.json({ error: 'Chave ainda não foi publicada' }, { status: 403 })
  }

  const { data: slots } = await supabaseAdmin
    .from('event_bracket_slots')
    .select(`
      *,
      registration:event_registrations(id, dados_atleta, academia:academias(nome, logo_url))
    `)
    .eq('bracket_id', bracketId)
    .order('rodada', { ascending: true })
    .order('posicao', { ascending: true })

  const { data: matches } = await supabaseAdmin
    .from('event_matches')
    .select(`
      *,
      athlete1:event_registrations!event_matches_athlete1_registration_id_fkey(id, dados_atleta, academia:academias(nome, logo_url)),
      athlete2:event_registrations!event_matches_athlete2_registration_id_fkey(id, dados_atleta, academia:academias(nome, logo_url))
    `)
    .eq('bracket_id', bracketId)
    .order('match_number', { ascending: true })

  return NextResponse.json(
    {
      evento: { id: evento.id, nome: evento.nome },
      bracket,
      slots: slots || [],
      matches: matches || [],
    },
    { headers: { 'Cache-Control': 'public, max-age=5, s-maxage=5' } }
  )
}
