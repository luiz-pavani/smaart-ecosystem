import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/eventos/[id]/atletas/search?q=...
 *
 * Endpoint público — espectadores procuram atletas por nome / academia / categoria.
 * Não requer autenticação porque o evento já é público se `publicado=true`.
 *
 * Retorna até 30 resultados, ranqueados por relevância (match no nome > academia).
 * Cada match traz registration_id pra navegar pra ficha do atleta no evento.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const q = (req.nextUrl.searchParams.get('q') || '').trim()

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Confirma que o evento é público
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, publicado')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento || !evento.publicado) {
    return NextResponse.json({ error: 'Evento não disponível' }, { status: 404 })
  }

  // Busca pelas inscrições do evento. Como nome do atleta está em
  // event_registrations.dados_atleta (jsonb snapshot), filtramos via expressão SQL.
  // O ilike na coluna jsonb requer cast — usamos uma query bruta via .or() não funciona;
  // então fazemos via .filter() com ->>nome.
  // PostgREST aceita `dados_atleta->>nome.ilike.*q*` usando .filter() ou .or().
  const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`

  // Carrega registrations + academia + category pra exibir o badge.
  // Limit 100 + filtro no client por simplicidade (eventos têm centenas, não milhares).
  const { data: registrations } = await supabaseAdmin
    .from('event_registrations')
    .select(`
      id, event_id, atleta_id, status, dados_atleta, peso_inscricao,
      academia:academias(id, nome, logo_url),
      category:event_categories(id, nome_display, genero)
    `)
    .eq('event_id', eventoId)
    .in('status', ['confirmed', 'pending_payment', 'pending_waivers'])
    .limit(500)

  if (!registrations || registrations.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const qLower = q.toLowerCase()
  type Reg = (typeof registrations)[number]

  const scored = registrations
    .map((r: Reg) => {
      const dados = (r.dados_atleta as Record<string, unknown>) || {}
      const nome = String(dados.nome || '').toLowerCase()
      const academia = String((r.academia as any)?.nome || '').toLowerCase()
      const categoria = String((r.category as any)?.nome_display || '').toLowerCase()
      let score = 0
      if (nome.startsWith(qLower)) score += 30
      else if (nome.includes(qLower)) score += 15
      if (academia.includes(qLower)) score += 5
      if (categoria.includes(qLower)) score += 3
      return { reg: r, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)

  const results = scored.map(({ reg }) => ({
    registration_id: reg.id,
    nome: ((reg.dados_atleta as any)?.nome) || 'Atleta',
    peso_inscricao: reg.peso_inscricao,
    status: reg.status,
    academia: reg.academia ? {
      id: (reg.academia as any).id,
      nome: (reg.academia as any).nome,
      logo_url: (reg.academia as any).logo_url,
    } : null,
    categoria: reg.category ? {
      id: (reg.category as any).id,
      nome_display: (reg.category as any).nome_display,
      genero: (reg.category as any).genero,
    } : null,
  }))

  // Pattern é só pra log/audit (PostgREST não foi usado pra filter; usamos client-side).
  void pattern

  return NextResponse.json({ results, total: results.length, query: q })
}
