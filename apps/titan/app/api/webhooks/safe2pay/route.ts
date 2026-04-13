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

  console.log('[WEBHOOK S2P]', { eventType, safe2payId, status, ref: payload.Reference })

  try {
    // ── 1. Cobrança única paga (Pix ou Cartão) ──────────────────────────────
    if (!eventType || eventType === 'payment') {
      if (status === 3 || status === 4) {
        await confirmarPagamento(safe2payId, payload)
      } else if (status === 6) {
        await atualizarStatusPagamento(safe2payId, 'cancelado')
      }
      return NextResponse.json({ ok: true })
    }

    // ── 2. Eventos de assinatura ────────────────────────────────────────────
    switch (eventType) {
      case 'SubscriptionCreated':
      case 'SubscriptionRenewed':
        if (status === 3 || status === 4) {
          await confirmarPagamento(safe2payId, payload)
        }
        break

      case 'SubscriptionFailed':
        await atualizarStatusPagamento(safe2payId, 'falhou')
        break

      case 'SubscriptionCanceled':
      case 'SubscriptionExpired':
        await atualizarStatusPagamento(safe2payId, 'cancelado')
        break

      default:
        console.warn('[WEBHOOK S2P] Evento não tratado:', eventType)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[WEBHOOK S2P] Erro:', err?.message)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

async function confirmarPagamento(safe2payId: string, payload: S2PPayload) {
  if (!safe2payId) return

  // Busca o registro de pagamento pelo safe2pay_id
  const { data: pag } = await supabaseAdmin
    .from('pagamentos')
    .select('id, referencia_tipo, referencia_id, status, metadata')
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
      // Aprova o pedido de filiação automaticamente ao pagamento confirmado
      const { data: pedido } = await supabaseAdmin
        .from('filiacao_pedidos')
        .update({
          status: 'APROVADO',
          revisado_em: new Date().toISOString(),
          observacao: 'Pagamento confirmado via Safe2Pay',
          updated_at: new Date().toISOString(),
        })
        .eq('id', referenciaId)
        .neq('status', 'APROVADO')
        .select('stakeholder_id, dados_formulario, created_at')
        .maybeSingle()

      // Renovar data_expiracao em user_fed_lrsj
      const stakeholderId = pedido?.stakeholder_id
      if (stakeholderId) {
        const base = new Date(pedido.created_at ?? Date.now())
        base.setFullYear(base.getFullYear() + 1)
        const novaExpiracao = base.toISOString().split('T')[0]
        await supabaseAdmin
          .from('user_fed_lrsj')
          .update({
            status_plano: 'Válido',
            status_membro: 'Aceito',
            data_adesao: new Date().toISOString().split('T')[0],
            data_expiracao: novaExpiracao,
            updated_at: new Date().toISOString(),
          })
          .eq('stakeholder_id', stakeholderId)
      }
      break
    }

    case 'event_registration':
      await supabaseAdmin
        .from('event_registrations')
        .update({ status: 'confirmed' })
        .eq('id', referenciaId)
        .eq('status', 'pending_payment')
      break

    case 'academia_anuidade':
      // Registra pagamento da anuidade na academia
      await supabaseAdmin
        .from('academias')
        .update({ ultima_anuidade_paga: new Date().getFullYear() })
        .eq('id', referenciaId)
      break

    default:
      console.log('[WEBHOOK S2P] Referência processada (sem ação extra):', tipo, referenciaId)
  }
}
