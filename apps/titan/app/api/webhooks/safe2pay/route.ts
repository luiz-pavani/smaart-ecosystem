import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/webhooks/safe2pay
 * Recebe eventos da Safe2Pay e atualiza pagamentos, filiações e inscrições.
 *
 * Status Safe2Pay:
 *   1 = Aguardando pagamento
 *   3 = Pago
 *   4 = Disponível
 *   5 = Contestação
 *   6 = Estornado
 *   11 = Em análise
 *   12 = Pendente de integração
 */

interface S2PPayload {
  EventType?: string
  IdTransaction?: number | string
  IdSubscription?: number | string
  Status?: number
  TransactionStatus?: { Id: number; Name: string }
  Amount?: number
  AmountDetails?: { TotalAmount: number }
  Reference?: string  // nosso referencia_id
  Customer?: { Email: string; Name?: string; Identity?: string; Phone?: string }
  PaymentMethod?: number
  [key: string]: any
}

export async function POST(req: NextRequest) {
  let payload: S2PPayload = {}

  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = payload.EventType
  const status = payload.TransactionStatus?.Id ?? payload.Status
  const safe2payId = String(payload.IdTransaction || payload.IdSubscription || '')

  if (process.env.DEBUG_WEBHOOKS === 'true') {
    console.log('[WEBHOOK S2P]', { eventType, status })
  }

  // 1) Registra o webhook (idempotente — unique index em
  //    provider+external_id+event_type+status_code retorna conflito para duplicatas).
  // status_code precisa entrar na key porque Safe2Pay manda múltiplos eventos pela
  // mesma transação (1 Pendente, 3 Pago, 4 Disponível, 6 Estornado) sem EventType.
  // Importante: eq() não casa NULL com string vazia no PostgREST — usa is(null) quando
  // event_type/status_code não vieram no payload.
  const statusStr = status != null ? String(status) : ''
  let eventRowId: number | null = null
  try {
    let query = supabaseAdmin
      .from('webhook_events')
      .select('id, processed')
      .eq('provider', 'safe2pay')
      .eq('external_id', safe2payId || '')
    query = eventType ? query.eq('event_type', eventType) : query.is('event_type', null)
    query = statusStr ? query.eq('status_code', statusStr) : query.is('status_code', null)
    const { data: existing } = await query.maybeSingle()

    if (existing) {
      eventRowId = existing.id
      if (existing.processed) {
        // Safe2Pay reenvia múltiplas vezes; já processamos. Retorna 200 pra ele parar.
        return NextResponse.json({ ok: true, idempotent: true })
      }
    } else {
      const { data: inserted } = await supabaseAdmin
        .from('webhook_events')
        .insert({
          provider: 'safe2pay',
          external_id: safe2payId || null,
          event_type: eventType || null,
          reference: payload.Reference || null,
          status_code: statusStr || null,
          payload: payload as unknown as object,
        })
        .select('id')
        .single()
      eventRowId = inserted?.id ?? null
    }
  } catch {
    // Falha em registrar o evento não pode bloquear o processamento.
    eventRowId = null
  }

  // 2) Processa o evento. Erros viram registro em webhook_events e 500 pro Safe2Pay
  //    (eles fazem retry automaticamente).
  try {
    if (!eventType || eventType === 'payment') {
      if (status === 3 || status === 4) {
        await confirmarPagamento(safe2payId, payload)
      } else if (status === 6) {
        await atualizarStatusPagamento(safe2payId, 'cancelado')
      }
    } else {
      switch (eventType) {
        case 'SubscriptionCreated':
        case 'SubscriptionRenewed':
          if (status === 3 || status === 4) await confirmarPagamento(safe2payId, payload)
          break
        case 'SubscriptionFailed':
          await atualizarStatusPagamento(safe2payId, 'falhou')
          break
        case 'SubscriptionCanceled':
        case 'SubscriptionExpired':
          await atualizarStatusPagamento(safe2payId, 'cancelado')
          break
        default:
          if (process.env.DEBUG_WEBHOOKS === 'true') {
            console.warn('[WEBHOOK S2P] Evento não tratado:', eventType)
          }
      }
    }

    if (eventRowId) {
      await supabaseAdmin
        .from('webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
          processing_error: null,
        })
        .eq('id', eventRowId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[WEBHOOK S2P] Erro de processamento')
    if (eventRowId) {
      try {
        const { error: rpcErr } = await supabaseAdmin.rpc(
          'increment_webhook_attempts',
          { p_id: eventRowId, p_error: errMsg }
        )
        if (rpcErr) throw rpcErr
      } catch {
        // Fallback caso a RPC não exista: update direto.
        await supabaseAdmin
          .from('webhook_events')
          .update({
            processing_error: errMsg,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', eventRowId)
      }
    }
    // 500 sinaliza para o Safe2Pay reentregar o webhook.
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 })
  }
}

async function confirmarPagamento(safe2payId: string, payload: S2PPayload) {
  if (!safe2payId) return

  // Busca o registro de pagamento pelo safe2pay_id
  const { data: pag } = await supabaseAdmin
    .from('pagamentos')
    .select('id, referencia_tipo, referencia_id, status, metadata, stakeholder_id, valor')
    .eq('safe2pay_id', safe2payId)
    .maybeSingle()

  if (!pag) {
    // Tenta pelo Reference (nosso ID interno)
    if (payload.Reference) {
      await supabaseAdmin
        .from('pagamentos')
        .update({ status: 'pago', updated_at: new Date().toISOString() })
        .eq('id', payload.Reference)
        .neq('status', 'pago')
    }
    return
  }

  if (pag.status === 'pago') return  // idempotente

  // Marca pagamento como pago
  await supabaseAdmin
    .from('pagamentos')
    .update({ status: 'pago', updated_at: new Date().toISOString() })
    .eq('id', pag.id)

  // Processa referência(s)
  const bulkIds: string[] | undefined = pag.metadata?.referencia_ids
  if (bulkIds?.length) {
    for (const rid of bulkIds) await processarReferencia(pag.referencia_tipo, rid)
  } else {
    await processarReferencia(pag.referencia_tipo, pag.referencia_id)
  }

  // Email de confirmação (best effort, não bloqueia)
  if (pag.stakeholder_id) {
    try {
      const { emailConfirmacaoPagamento } = await import('@/lib/email')
      const { data: stake } = await supabaseAdmin
        .from('stakeholders')
        .select('email, nome_completo')
        .eq('id', pag.stakeholder_id)
        .maybeSingle()
      if (stake?.email && stake?.nome_completo) {
        const descricao = descricaoPorReferencia(pag.referencia_tipo)
        await emailConfirmacaoPagamento({
          nome: stake.nome_completo,
          email: stake.email,
          valor: Number(pag.valor) || 0,
          descricao,
        })
      }
    } catch (err) {
      // Email opcional — falha não compromete a confirmação do pagamento.
      console.warn('[email confirmacao] falhou:', err instanceof Error ? err.message : err)
    }
  }
}

function descricaoPorReferencia(tipo: string): string {
  switch (tipo) {
    case 'filiacao_pedido':
    case 'filiacao_atleta': return 'Filiação à federação'
    case 'evento':
    case 'evento_inscricao':
    case 'event_registration': return 'Inscrição em evento'
    case 'academia_anuidade': return 'Anuidade da academia'
    case 'academia_mensalidade': return 'Mensalidade da academia'
    case 'profep':
    case 'profep_inscricao': return 'Inscrição no Profep'
    case 'ppv': return 'Acesso à transmissão (PPV)'
    default: return 'Pagamento'
  }
}

async function atualizarStatusPagamento(safe2payId: string, status: string) {
  if (!safe2payId) return
  await supabaseAdmin
    .from('pagamentos')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('safe2pay_id', safe2payId)
}

async function processarReferencia(tipo: string, referenciaId: string | null) {
  if (!referenciaId) return

  switch (tipo) {
    case 'filiacao_pedido':
    case 'filiacao_atleta': {
      // Aprova o pedido (idempotente — re-update em pedido já APROVADO é no-op semântico,
      // mas precisa retornar o stakeholder_id no segundo webhook pra atualizar user_fed_lrsj).
      await supabaseAdmin
        .from('filiacao_pedidos')
        .update({
          status: 'APROVADO',
          revisado_em: new Date().toISOString(),
          observacao: 'Pagamento confirmado via Safe2Pay',
          updated_at: new Date().toISOString(),
        })
        .eq('id', referenciaId)

      const { data: pedido } = await supabaseAdmin
        .from('filiacao_pedidos')
        .select('stakeholder_id, federacao_id, academia_id, created_at')
        .eq('id', referenciaId)
        .maybeSingle()

      // Cria/atualiza linha em user_fed_lrsj (UPSERT — atleta de 1ª filiação ainda não tem linha).
      // nome_completo é NOT NULL — buscar do stakeholder.
      if (pedido?.stakeholder_id) {
        const base = new Date(pedido.created_at ?? Date.now())
        base.setFullYear(base.getFullYear() + 1)
        const novaExpiracao = base.toISOString().split('T')[0]

        const { data: stake } = await supabaseAdmin
          .from('stakeholders')
          .select('nome_completo, kyu_dan_id, email, telefone, genero, data_nascimento')
          .eq('id', pedido.stakeholder_id)
          .maybeSingle()

        await supabaseAdmin
          .from('user_fed_lrsj')
          .upsert(
            {
              stakeholder_id: pedido.stakeholder_id,
              nome_completo: stake?.nome_completo ?? 'Sem nome',
              federacao_id: pedido.federacao_id,
              academia_id: pedido.academia_id ?? null,
              kyu_dan_id: stake?.kyu_dan_id ?? null,
              email: stake?.email ?? null,
              telefone: stake?.telefone ?? null,
              genero: stake?.genero ?? null,
              data_nascimento: stake?.data_nascimento ?? null,
              status_plano: 'Válido',
              status_membro: 'Aceito',
              data_adesao: new Date().toISOString().split('T')[0],
              data_expiracao: novaExpiracao,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'stakeholder_id' }
          )
      }
      break
    }

    case 'evento':
    case 'event_registration': {
      // event_registrations.status flow: pending_payment → confirmed.
      // Idempotente: re-update em confirmed é no-op.
      await supabaseAdmin
        .from('event_registrations')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', referenciaId)
        .in('status', ['pending_payment', 'pending_waivers'])
      break
    }

    case 'academia_anuidade':
      // Registra pagamento da anuidade na academia
      await supabaseAdmin
        .from('academias')
        .update({ ultima_anuidade_paga: new Date().getFullYear() })
        .eq('id', referenciaId)
      break

    default:
      if (process.env.DEBUG_WEBHOOKS === 'true') {
        console.log('[WEBHOOK S2P] Referência processada:', tipo)
      }
  }
}
