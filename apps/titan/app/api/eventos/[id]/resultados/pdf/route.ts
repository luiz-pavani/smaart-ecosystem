import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET /api/eventos/[id]/resultados/pdf — gerar PDF de resultados
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const categoryFilter = req.nextUrl.searchParams.get('category') || ''

  // Get event info
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('nome, data_evento, local')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  // Get results
  let query = supabaseAdmin
    .from('event_results')
    .select('*')
    .eq('evento_id', eventoId)
    .order('categoria', { ascending: true })
    .order('colocacao', { ascending: true })

  if (categoryFilter) {
    query = query.eq('categoria', categoryFilter)
  }

  const { data: results } = await query

  if (!results || results.length === 0) {
    return NextResponse.json({ error: 'Nenhum resultado' }, { status: 404 })
  }

  // Build medal board
  const medalBoard: Record<string, { academia: string; gold: number; silver: number; bronze: number; total: number }> = {}
  for (const r of results) {
    if (!r.medal) continue
    const key = r.academia_nome || 'Sem academia'
    if (!medalBoard[key]) medalBoard[key] = { academia: key, gold: 0, silver: 0, bronze: 0, total: 0 }
    if (r.medal === 'gold') medalBoard[key].gold++
    else if (r.medal === 'silver') medalBoard[key].silver++
    else if (r.medal === 'bronze') medalBoard[key].bronze++
    medalBoard[key].total++
  }
  const board = Object.values(medalBoard).sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze)

  // Group by category
  const grouped: Record<string, typeof results> = {}
  for (const r of results) {
    const cat = r.categoria || 'Sem categoria'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(r)
  }

  // Generate HTML → PDF-ready page (print-friendly)
  const medalEmoji = (m: string) => m === 'gold' ? '🥇' : m === 'silver' ? '🥈' : m === 'bronze' ? '🥉' : ''

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Resultados — ${evento.nome}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 24px; font-size: 11px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin: 16px 0 6px; border-bottom: 2px solid #333; padding-bottom: 3px; }
  h3 { font-size: 12px; margin: 12px 0 4px; color: #444; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #f0f0f0; text-align: left; padding: 4px 8px; font-size: 10px; border: 1px solid #ddd; }
  td { padding: 4px 8px; border: 1px solid #eee; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .gold { color: #b8860b; }
  .silver { color: #666; }
  .bronze { color: #8b4513; }
  .page-break { page-break-before: always; }
  @media print { body { padding: 0; } }
</style>
</head><body>

<h1>📊 Resultados — ${evento.nome}</h1>
<div class="subtitle">${evento.data_evento || ''} — ${evento.local || ''}</div>

${!categoryFilter ? `
<h2>🏅 Quadro de Medalhas</h2>
<table>
  <tr><th>#</th><th>Academia</th><th class="center">🥇</th><th class="center">🥈</th><th class="center">🥉</th><th class="center">Total</th></tr>
  ${board.map((r, i) => `<tr>
    <td>${i + 1}</td><td class="bold">${r.academia}</td>
    <td class="center gold bold">${r.gold || '-'}</td>
    <td class="center silver bold">${r.silver || '-'}</td>
    <td class="center bronze bold">${r.bronze || '-'}</td>
    <td class="center bold">${r.total}</td>
  </tr>`).join('')}
</table>
` : ''}

<h2>🏆 Resultados por Categoria</h2>
${Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, rs]) => `
<h3>${cat}</h3>
<table>
  <tr><th style="width:30px"></th><th>Atleta</th><th>Academia</th><th class="center" style="width:40px">Pos.</th></tr>
  ${rs.sort((a, b) => a.colocacao - b.colocacao).map(r => `<tr>
    <td>${medalEmoji(r.medal)}</td>
    <td class="bold">${r.atleta_nome || 'Atleta'}</td>
    <td>${r.academia_nome || ''}</td>
    <td class="center">${r.colocacao}º</td>
  </tr>`).join('')}
</table>
`).join('')}

<div style="margin-top: 24px; text-align: center; color: #999; font-size: 9px;">
  Gerado por Titan — SMAART PRO • ${new Date().toLocaleDateString('pt-BR')}
</div>

</body></html>`

  // Add auto-print script so browser opens print dialog (save as PDF)
  const htmlWithPrint = html.replace('</body>', `
<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 500); };
</script>
</body>`)

  return new NextResponse(htmlWithPrint, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="resultados_${evento.nome.replace(/\s+/g, '_').toLowerCase()}.pdf"`,
    },
  })
}
