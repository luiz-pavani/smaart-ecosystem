import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { renderToBuffer } from '@react-pdf/renderer'
import { ResultadosDocument } from '@/lib/pdf/ResultadosDocument'

// Força runtime Node (renderToBuffer não roda em Edge)
export const runtime = 'nodejs'
// Permite até ~30s pra gerar PDF de evento grande (muitas categorias).
export const maxDuration = 30

/**
 * GET /api/eventos/[id]/resultados/pdf
 *
 * Gera PDF binário oficial dos resultados do evento.
 *
 * Query:
 *   ?category=Nome  → filtra apenas uma categoria (sem medalhão)
 *   ?download=1     → Content-Disposition: attachment (força download)
 *                     default: inline (abre no browser tab)
 *
 * Endpoint público — só responde se evento existir e tem resultados.
 * Usa @react-pdf/renderer com layout estruturado (tabelas, paginação,
 * número de página automático). Antes era HTML+window.print, que dependia
 * do browser e gerava PDFs inconsistentes entre navegadores.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const categoryFilter = req.nextUrl.searchParams.get('category') || ''
  const forceDownload = req.nextUrl.searchParams.get('download') === '1'

  // Get event info
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('nome, data_evento, local, publicado')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  // Get results
  let query = supabaseAdmin
    .from('event_results')
    .select('categoria, colocacao, medal, atleta_nome, academia_nome, academia_id')
    .eq('evento_id', eventoId)
    .order('categoria', { ascending: true })
    .order('colocacao', { ascending: true })

  if (categoryFilter) query = query.eq('categoria', categoryFilter)

  const { data: results } = await query

  if (!results || results.length === 0) {
    return NextResponse.json({ error: 'Nenhum resultado registrado ainda' }, { status: 404 })
  }

  // Build medal board agrupado por (academia_id || academia_nome)
  const medalMap = new Map<string, { academia_nome: string; gold: number; silver: number; bronze: number; total: number }>()
  for (const r of results) {
    const key = r.academia_id || `__no_id__${(r.academia_nome || '').toLowerCase().trim()}`
    if (!medalMap.has(key)) {
      medalMap.set(key, { academia_nome: r.academia_nome || 'Sem academia', gold: 0, silver: 0, bronze: 0, total: 0 })
    }
    const entry = medalMap.get(key)!
    let medal = (r.medal as string | null)?.toLowerCase() || null
    if (!medal) {
      if (r.colocacao === 1) medal = 'gold'
      else if (r.colocacao === 2) medal = 'silver'
      else if (r.colocacao === 3) medal = 'bronze'
    }
    if (medal === 'gold') entry.gold++
    else if (medal === 'silver') entry.silver++
    else if (medal === 'bronze') entry.bronze++
    if (medal) entry.total++
  }
  const medalBoard = Array.from(medalMap.values())
    .filter(a => a.total > 0)
    .sort((a, b) => {
      if (b.gold !== a.gold) return b.gold - a.gold
      if (b.silver !== a.silver) return b.silver - a.silver
      if (b.bronze !== a.bronze) return b.bronze - a.bronze
      return a.academia_nome.localeCompare(b.academia_nome, 'pt-BR')
    })

  // Gera PDF
  const buffer = await renderToBuffer(
    <ResultadosDocument
      evento={{
        nome: evento.nome,
        data_evento: evento.data_evento,
        local: evento.local,
      }}
      results={results.map(r => ({
        categoria: r.categoria,
        colocacao: r.colocacao,
        medal: r.medal,
        atleta_nome: r.atleta_nome,
        academia_nome: r.academia_nome,
      }))}
      medalBoard={medalBoard}
      categoryFilter={categoryFilter || undefined}
    />
  )

  const safeName = evento.nome.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
  const filename = categoryFilter
    ? `resultados_${safeName}_${categoryFilter.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.pdf`
    : `resultados_${safeName}.pdf`

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${forceDownload ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  })
}
