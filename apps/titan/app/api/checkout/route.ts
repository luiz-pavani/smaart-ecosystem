import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  createPixCharge,
  createCardCharge,
  createSubscription,
  createPlan,
  Safe2PayCustomer,
} from '@/lib/safe2pay'

/**
 * POST /api/checkout
 *
 * Body:
 * {
 *   produto: 'filiacao_atleta' | 'anuidade_academia' | 'profep' | 'evento' | 'filiacao_bulk'
 *   referencia_id: string   // filiacao_pedido id, event_registration id, academia id, etc.
 *   metodo: 'pix' | 'cartao' | 'recorrente'
 *   card_token?: string     // para metodo cartao/recorrente
 *   customer: { name, identity, email, phone, address? }
 *   valor?: number          // override de valor (para filiacao_bulk com total)
 *   descricao?: string      // descrição opcional
 * }
 *
 * Retorna:
 * {
 *   pagamento_id: string
 *   pix_qr_code?: string
 *   pix_qr_code_url?: string
 *   status: 'pendente' | 'pago'
 *   safe2pay_id?: string
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const {
    produto, referencia_id, referencia_ids,  // referencia_ids para bulk
    metodo, card_token, customer, valor: valorOverride, descricao,
    academia_id,  // for per-academia Safe2Pay credentials
  } = body

  if (!produto || !metodo || !customer) {
    return NextResponse.json({ error: 'produto, metodo e customer são obrigatórios' }, { status: 400 })
  }

  // ── Resolver credenciais per-academia (se academia_id fornecido) ──────────

  let apiToken: string | undefined  // undefined = use global SAFE2PAY_API_KEY
  let webhookUrl: string | undefined

  if (academia_id) {
    const { data: acad } = await supabaseAdmin
      .from('academias')
      .select('safe2pay_api_key, safe2pay_webhook_url, pagamento_habilitado')
      .eq('id', academia_id)
      .maybeSingle()

    if (acad?.safe2pay_api_key && acad?.pagamento_habilitado) {
      apiToken = acad.safe2pay_api_key
      webhookUrl = acad.safe2pay_webhook_url || undefined
    }
  }

  // ── Resolver valor ────────────────────────────────────────────────────────

  let valor = valorOverride as number | undefined
  let descricaoProduto = descricao || ''
  let referenciaId = referencia_id as string | undefined
  const referenciaIds = referencia_ids as string[] | undefined  // bulk

  if (!valor) {
    const resolved = await resolverValor(produto, referencia_id, user.id)
    if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: 400 })
    valor = resolved.valor!
    descricaoProduto = descricaoProduto || resolved.descricao!
  }

  if (!descricaoProduto) descricaoProduto = `Pagamento Titan — ${produto}`

  // ── Customer Safe2Pay ─────────────────────────────────────────────────────

  const s2pCustomer: Safe2PayCustomer = {
    Name: customer.name,
    Identity: String(customer.identity || '').replace(/\D/g, ''),
    Phone: customer.phone || '',
    Email: customer.email || user.email || '',
    Address: customer.address,
  }

  // ── Processar pagamento ───────────────────────────────────────────────────

  let safe2payId: string | undefined
  let pixQrCode: string | undefined
  let pixQrCodeUrl: string | undefined
  let statusPagamento: 'pendente' | 'pago' = 'pendente'

  if (metodo === 'pix') {
    const result = await createPixCharge({
      amount: valor,
      customer: s2pCustomer,
      description: descricaoProduto,
      referenceCode: referenciaId,
      ...(apiToken && { apiToken }),
      ...(webhookUrl && { webhookUrl }),
    })

    if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })

    safe2payId = String(result.idTransaction || '')
    pixQrCode = result.qrCode
    pixQrCodeUrl = result.qrCodeUrl
    // status 3 = pago imediatamente (improvável para Pix, mas possível em sandbox)
    if (result.status === 3 || result.status === 4) statusPagamento = 'pago'

  } else if (metodo === 'cartao') {
    if (!card_token) return NextResponse.json({ error: 'card_token obrigatório para cartão' }, { status: 400 })

    const result = await createCardCharge({
      amount: valor,
      customer: s2pCustomer,
      tokenizedCard: card_token,
      description: descricaoProduto,
      referenceCode: referenciaId,
      ...(apiToken && { apiToken }),
      ...(webhookUrl && { webhookUrl }),
    })

    if (result.error) return NextResponse.json({ error: result.error }, { status: 502 })

    safe2payId = String(result.idTransaction || '')
    if (result.status === 3 || result.status === 4) statusPagamento = 'pago'

  } else if (metodo === 'recorrente') {
    if (!card_token) return NextResponse.json({ error: 'card_token obrigatório para recorrente' }, { status: 400 })

    const planResult = await obterOuCriarPlano(produto, valor)
    if (planResult.error) return NextResponse.json({ error: planResult.error }, { status: 502 })

    const subResult = await createSubscription({
      planId: planResult.planId!,
      tokenizedCard: card_token,
      customer: s2pCustomer,
      ...(apiToken && { apiToken }),
    })

    if (subResult.error) return NextResponse.json({ error: subResult.error }, { status: 502 })

    safe2payId = subResult.subscriptionId
    // Assinatura criada — cobrança ocorre conforme plano
    statusPagamento = 'pendente'

  } else {
    return NextResponse.json({ error: `Método inválido: ${metodo}` }, { status: 400 })
  }

  // ── Inserir em pagamentos ─────────────────────────────────────────────────

  const { data: pag, error: insertError } = await supabaseAdmin
    .from('pagamentos')
    .insert({
      stakeholder_id: user.id,
      referencia_tipo: produto,
      referencia_id: referenciaId || null,
      safe2pay_id: safe2payId || null,
      tipo: metodo === 'recorrente' ? 'recorrente' : metodo,
      valor,
      status: statusPagamento,
      pix_qr_code: pixQrCode || null,
      pix_qr_code_url: pixQrCodeUrl || null,
      pix_expiracao: metodo === 'pix'
        ? new Date(Date.now() + 30 * 60 * 1000).toISOString()  // 30 min
        : null,
      metadata: { produto, customer: s2pCustomer, referencia_ids: referenciaIds || null },
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[CHECKOUT] Erro ao salvar pagamento:', insertError)
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
  }

  // Se pago na hora, processa referências imediatamente
  if (statusPagamento === 'pago') {
    if (referenciaIds?.length) {
      for (const rid of referenciaIds) await processarReferencia(produto, rid)
    } else if (referenciaId) {
      await processarReferencia(produto, referenciaId)
    }
  }

  return NextResponse.json({
    pagamento_id: pag.id,
    pix_qr_code: pixQrCode,
    pix_qr_code_url: pixQrCodeUrl,
    status: statusPagamento,
    safe2pay_id: safe2payId,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolverValor(
  produto: string,
  referenciaId: string | undefined,
  userId: string
): Promise<{ valor?: number; descricao?: string; error?: string }> {
  switch (produto) {
    case 'filiacao_atleta': {
      if (!referenciaId) return { error: 'referencia_id obrigatório para filiacao_atleta' }
      const { data: pedido } = await supabaseAdmin
        .from('filiacao_pedidos')
        .select('dados_formulario')
        .eq('id', referenciaId)
        .maybeSingle()
      const valor = pedido?.dados_formulario?.valor
      if (!valor) return { error: 'Valor não definido no pedido de filiação' }
      return { valor, descricao: 'Anuidade LRSJ 2026' }
    }

    case 'filiacao_bulk': {
      // valor vem no body como override
      return { valor: 0, descricao: 'Anuidade LRSJ 2026 (lote)' }
    }

    case 'anuidade_academia': {
      return { valor: 69.0, descricao: 'Anuidade Academia LRSJ 2026' }
    }

    case 'profep': {
      return { valor: 2200.0, descricao: 'PROFEP 2026 — Curso completo' }
    }

    case 'evento': {
      if (!referenciaId) return { error: 'referencia_id obrigatório para evento' }
      const { data: reg } = await supabaseAdmin
        .from('event_registrations')
        .select('valor, evento:event_id(nome)')
        .eq('id', referenciaId)
        .maybeSingle()
      const valor = (reg as any)?.valor ?? 98
      const nome = (reg as any)?.evento?.nome || 'Evento LRSJ'
      return { valor, descricao: `Inscrição — ${nome}` }
    }

    case 'academia_mensalidade': {
      if (!referenciaId) return { error: 'referencia_id (plano_id) obrigatório para academia_mensalidade' }
      const { data: plano } = await supabaseAdmin
        .from('academia_planos')
        .select('valor, nome')
        .eq('id', referenciaId)
        .maybeSingle()
      if (!plano) return { error: 'Plano não encontrado' }
      return { valor: plano.valor, descricao: `Mensalidade — ${plano.nome}` }
    }

    default:
      return { error: `Produto desconhecido: ${produto}` }
  }
}

/** Busca plano existente no banco ou cria um novo no Safe2Pay */
async function obterOuCriarPlano(
  produto: string,
  valor: number
): Promise<{ planId?: string; error?: string }> {
  // Planos fixos por produto (armazenamos na tabela configuracoes ou hardcoded)
  const PLANOS: Record<string, { env: string; name: string; frequency: 1 | 2 | 3 | 4; cycle?: number }> = {
    anuidade_academia: {
      env: 'SAFE2PAY_PLAN_ACADEMIA',
      name: 'Anuidade Academia LRSJ 2026',
      frequency: 1,
      cycle: 10,
    },
    profep: {
      env: 'SAFE2PAY_PLAN_PROFEP',
      name: 'PROFEP 2026 — Parcelado',
      frequency: 1,
      cycle: 20,
    },
  }

  const config = PLANOS[produto]
  if (!config) return { error: `Produto sem plano recorrente: ${produto}` }

  // Verifica se já temos o planId em env
  const existingPlanId = process.env[config.env]
  if (existingPlanId) return { planId: existingPlanId }

  // Cria o plano
  const result = await createPlan({
    name: config.name,
    amount: valor,
    frequency: config.frequency,
    billingCycle: config.cycle,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'}/api/webhooks/safe2pay`,
  })

  return result
}

async function processarReferencia(tipo: string, referenciaId: string) {
  switch (tipo) {
    case 'filiacao_atleta':
    case 'filiacao_bulk':
      await supabaseAdmin
        .from('filiacao_pedidos')
        .update({ status: 'APROVADO', revisado_em: new Date().toISOString(), observacao: 'Pago online' })
        .eq('id', referenciaId)
        .eq('status', 'PENDENTE')
      break
    case 'event_registration':
      await supabaseAdmin
        .from('event_registrations')
        .update({ status: 'confirmed' })
        .eq('id', referenciaId)
      break
    case 'profep':
      await supabaseAdmin
        .from('candidato_inscricoes')
        .update({ status_pagamento: 'APROVADO' })
        .eq('id', referenciaId)
      break
  }
}
