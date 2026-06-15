import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/eventos/[id]/resultados/medalhao
 *
 * Endpoint público — medalheiro por academia.
 *
 * Soma medalhas (ouro + prata + bronze) por academia_id do event_results.
 * Ordenação: padrão olímpico (ouro desc → prata desc → bronze desc → nome asc).
 *
 * Trata 2 bronzes IJF: a tabela já guarda cada bronze como uma linha separada.
 *
 * Sem academia_id (snapshot vazio): agrupa em "Independente / sem academia"
 * por academia_nome (texto), pra não perder atletas avulsos.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params

  // Confirma que evento é público
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, publicado')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento || !evento.publicado) {
    return NextResponse.json({ error: 'Evento não disponível' }, { status: 404 })
  }

  const { data: results } = await supabaseAdmin
    .from('event_results')
    .select(`
      id, medal, colocacao, academia_id, academia_nome, atleta_nome,
      academia:academias(id, nome, logo_url)
    `)
    .eq('evento_id', eventoId)

  if (!results || results.length === 0) {
    return NextResponse.json({ medalhao: [], total_medals: 0, total_academias: 0 })
  }

  // Agrupa por academia
  type Acc = {
    academia_id: string | null
    academia_nome: string
    logo_url: string | null
    gold: number
    silver: number
    bronze: number
    total: number
  }
  const map = new Map<string, Acc>()

  for (const r of results) {
    const academiaIdResolved = r.academia_id || null
    const acaObj = (r.academia as any) || null
    const academiaNome =
      acaObj?.nome ||
      r.academia_nome ||
      'Independente / sem academia'
    // Chave: academia_id se houver, senão nome normalizado (lower trim)
    const key = academiaIdResolved || `__no_id__::${academiaNome.toLowerCase().trim()}`

    if (!map.has(key)) {
      map.set(key, {
        academia_id: academiaIdResolved,
        academia_nome: academiaNome,
        logo_url: acaObj?.logo_url ?? null,
        gold: 0,
        silver: 0,
        bronze: 0,
        total: 0,
      })
    }
    const a = map.get(key)!
    // Inferir medal da colocacao se medal não vier
    let medal = (r.medal as string | null)?.toLowerCase() || null
    if (!medal) {
      if (r.colocacao === 1) medal = 'gold'
      else if (r.colocacao === 2) medal = 'silver'
      else if (r.colocacao === 3) medal = 'bronze'
    }
    if (medal === 'gold') a.gold++
    else if (medal === 'silver') a.silver++
    else if (medal === 'bronze') a.bronze++
    if (medal) a.total++
  }

  const medalhao = Array.from(map.values())
    .filter(a => a.total > 0)
    .sort((a, b) => {
      if (b.gold !== a.gold) return b.gold - a.gold
      if (b.silver !== a.silver) return b.silver - a.silver
      if (b.bronze !== a.bronze) return b.bronze - a.bronze
      return a.academia_nome.localeCompare(b.academia_nome, 'pt-BR')
    })
    .map((a, idx) => ({
      colocacao: idx + 1,
      ...a,
    }))

  return NextResponse.json({
    medalhao,
    total_medals: medalhao.reduce((s, a) => s + a.total, 0),
    total_academias: medalhao.length,
  })
}
