import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/eventos/[id]/schedule/public
 *
 * Endpoint público para TV/display de cronograma. Sem auth.
 * Estrutura: para cada tatame ativo, traz:
 *   - current: luta com status='in_progress'
 *   - upcoming: próximas 5 lutas com status in ('ready', 'pending')
 *
 * Cache HTTP de 5s pra reduzir carga em monitor que pollea muito rápido.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params

  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, num_areas, publicado, status')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento || !evento.publicado) {
    return NextResponse.json({ error: 'Evento não disponível' }, { status: 404 })
  }

  const numAreas = evento.num_areas || 1

  // Single query — todas as lutas do evento via JOIN com brackets
  const { data: matches } = await supabaseAdmin
    .from('event_matches')
    .select(`
      id, match_number, area_id, hora_estimada, status, tipo,
      athlete1_registration_id, athlete2_registration_id,
      bracket:event_brackets!inner(
        id, area_id, evento_id,
        category:event_categories(id, nome_display, genero)
      ),
      athlete1:event_registrations!event_matches_athlete1_registration_id_fkey(id, dados_atleta, academia:academias(nome, logo_url)),
      athlete2:event_registrations!event_matches_athlete2_registration_id_fkey(id, dados_atleta, academia:academias(nome, logo_url))
    `)
    .eq('bracket.evento_id', eventoId)
    .neq('status', 'walkover')
    .order('match_number', { ascending: true })

  type MatchOut = {
    id: string
    match_number: number
    status: string
    tipo: string
    hora_estimada: string | null
    category_nome: string | null
    athlete1: { nome: string; academia: string | null; logo_url: string | null } | null
    athlete2: { nome: string; academia: string | null; logo_url: string | null } | null
  }

  const shapeMatch = (m: any): MatchOut => {
    const a1 = m.athlete1 as any
    const a2 = m.athlete2 as any
    const cat = (m.bracket as any)?.category
    return {
      id: m.id,
      match_number: m.match_number ?? 0,
      status: m.status,
      tipo: m.tipo,
      hora_estimada: m.hora_estimada,
      category_nome: cat?.nome_display ?? null,
      athlete1: a1 ? {
        nome: (a1.dados_atleta?.nome as string) || (a1.dados_atleta?.nome_completo as string) || 'Atleta 1',
        academia: a1.academia?.nome ?? null,
        logo_url: a1.academia?.logo_url ?? null,
      } : null,
      athlete2: a2 ? {
        nome: (a2.dados_atleta?.nome as string) || (a2.dados_atleta?.nome_completo as string) || 'Atleta 2',
        academia: a2.academia?.nome ?? null,
        logo_url: a2.academia?.logo_url ?? null,
      } : null,
    }
  }

  const areas: Array<{
    area_id: number
    current: MatchOut | null
    upcoming: MatchOut[]
  }> = []

  for (let a = 1; a <= numAreas; a++) {
    const areaMatches = (matches || []).filter(m => (m.area_id ?? (m.bracket as any)?.area_id) === a)
    const current = areaMatches.find(m => m.status === 'in_progress')
    const upcoming = areaMatches
      .filter(m => m.status === 'ready' || m.status === 'pending')
      .slice(0, 5)

    areas.push({
      area_id: a,
      current: current ? shapeMatch(current) : null,
      upcoming: upcoming.map(shapeMatch),
    })
  }

  return NextResponse.json(
    {
      evento: { id: evento.id, nome: evento.nome, status: evento.status },
      areas,
    },
    {
      headers: { 'Cache-Control': 'public, max-age=5, s-maxage=5' },
    }
  )
}
