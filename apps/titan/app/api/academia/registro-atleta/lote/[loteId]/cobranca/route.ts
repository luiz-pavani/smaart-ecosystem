import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarLote, resolverStaffRegistro } from '@/lib/registro/server'
import { criarPedidoFederacao } from '@/lib/registro/pedido'

type Params = { params: Promise<{ loteId: string }> }

interface ItemCobranca {
  ficha_id: string
  nome_patch?: string
  tamanho_patch?: string
  cor_patch?: string
  projeto_social?: boolean
  enviar_para_revisao?: boolean
  genero?: string
}

/**
 * POST { itens: ItemCobranca[] } — cria os pedidos de filiação dos atletas escolhidos (taxa calculada
 * no servidor, uma por atleta) e devolve o total para um checkout único (produto filiacao_bulk).
 * Quem paga é o professor/academia.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { loteId } = await params
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })
  const lote = await carregarLote(staff, loteId)
  if (!lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })

  const itens = ((await req.json().catch(() => ({}))).itens ?? []) as ItemCobranca[]
  if (!itens.length) return NextResponse.json({ error: 'Escolha ao menos um atleta' }, { status: 400 })

  const { data: fichas } = await supabaseAdmin
    .from('academia_atleta_fichas')
    .select('*')
    .eq('lote_id', lote.id)
    .in('id', itens.map((i) => i.ficha_id))

  const resultados: { ficha_id: string; ok: boolean; pedido_id?: string; valor?: number; error?: string }[] = []
  for (const item of itens) {
    const ficha = fichas?.find((f) => f.id === item.ficha_id)
    if (!ficha) { resultados.push({ ficha_id: item.ficha_id, ok: false, error: 'Atleta não pertence ao lote' }); continue }
    const r = await criarPedidoFederacao(staff.userId, ficha, {
      ...item,
      federacao_id: ficha.filiar_federacao_id,
    })
    resultados.push(r.ok
      ? { ficha_id: item.ficha_id, ok: true, pedido_id: r.pedido_id, valor: r.valor }
      : { ficha_id: item.ficha_id, ok: false, error: r.error })
  }

  const ok = resultados.filter((r) => r.ok)
  const total = Math.round(ok.reduce((s, r) => s + (r.valor ?? 0), 0) * 100) / 100

  const { data: eu } = await supabaseAdmin.from('stakeholders').select('nome_completo, cpf, email, telefone').eq('id', staff.userId).maybeSingle()
  return NextResponse.json({
    resultados,
    pedido_ids: ok.map((r) => r.pedido_id),
    total,
    pagador: { name: eu?.nome_completo ?? '', identity: eu?.cpf ?? '', email: eu?.email ?? '', phone: eu?.telefone ?? '' },
  })
}
