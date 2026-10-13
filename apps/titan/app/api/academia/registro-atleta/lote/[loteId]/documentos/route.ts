import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarLote, resolverStaffRegistro } from '@/lib/registro/server'
import { prepararArquivo, salvarDocumentoFicha } from '@/lib/registro/documento'
import { extrairDocumento, nomesBatem } from '@/lib/registro/verificacao-documento'

export const runtime = 'nodejs'
export const maxDuration = 60

type Params = { params: Promise<{ loteId: string }> }

/**
 * POST multipart { file, ficha_id? } — documento de identidade de um atleta do lote.
 * Sem ficha_id, a IA lê o documento e o sistema descobre de quem é (nome + nascimento) entre os atletas
 * do lote; depois verifica contra o cadastro como no registro individual. Um arquivo por chamada.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { loteId } = await params
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })
  const lote = await carregarLote(staff, loteId)
  if (!lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })

  const form = await req.formData()
  const file = form.get('file')
  const fichaAlvo = form.get('ficha_id')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Envie o documento' }, { status: 400 })
  const arq = await prepararArquivo(file)
  if ('erro' in arq) return NextResponse.json({ error: arq.erro }, { status: 400 })

  const { data: fichas } = await supabaseAdmin
    .from('academia_atleta_fichas')
    .select('id, stakeholder_id, rg, verificacao_status')
    .eq('lote_id', lote.id)
  if (!fichas?.length) return NextResponse.json({ error: 'Lote sem atletas' }, { status: 400 })

  if (typeof fichaAlvo === 'string' && fichaAlvo) {
    const ficha = fichas.find((f) => f.id === fichaAlvo)
    if (!ficha) return NextResponse.json({ error: 'Atleta não pertence ao lote' }, { status: 404 })
    const r = await salvarDocumentoFicha(ficha, arq)
    if ('erro' in r) return NextResponse.json({ error: r.erro }, { status: 500 })
    return NextResponse.json({ ficha_id: ficha.id, verificacao_status: r.resultado.status, motivo: r.resultado.motivo })
  }

  const extraido = await extrairDocumento(arq)
  if (!extraido.ok) return NextResponse.json({ error: extraido.motivo }, { status: 422 })
  const ext = extraido.extracao

  const { data: atletas } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, data_nascimento')
    .in('id', fichas.map((f) => f.stakeholder_id))
  // Pontua: nome bate (+2), nascimento bate (+1). Exige nome; empate entre atletas não é resolvido.
  const pontos = fichas.map((f) => {
    const a = atletas?.find((x) => x.id === f.stakeholder_id)
    const nome = !!a && nomesBatem(a.nome_completo ?? '', ext.nome)
    const nasc = !!a && !!ext.data_nascimento && a.data_nascimento === ext.data_nascimento
    return { ficha: f, nome: a?.nome_completo ?? '', score: nome ? 2 + (nasc ? 1 : 0) : 0 }
  }).filter((p) => p.score > 0).sort((x, y) => y.score - x.score)

  if (!pontos.length || (pontos[1] && pontos[1].score === pontos[0].score)) {
    return NextResponse.json({
      nao_identificado: true,
      documento: { nome: ext.nome, data_nascimento: ext.data_nascimento },
      error: pontos.length ? 'Mais de um atleta do lote combina com este documento. Envie pela linha do atleta.' : 'Nenhum atleta do lote combina com este documento. Envie pela linha do atleta.',
    }, { status: 422 })
  }

  const alvo = pontos[0]
  const r = await salvarDocumentoFicha(alvo.ficha, arq, extraido)
  if ('erro' in r) return NextResponse.json({ error: r.erro }, { status: 500 })
  return NextResponse.json({ ficha_id: alvo.ficha.id, nome: alvo.nome, verificacao_status: r.resultado.status, motivo: r.resultado.motivo })
}
