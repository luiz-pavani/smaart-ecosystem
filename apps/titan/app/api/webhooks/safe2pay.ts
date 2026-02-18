import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Webhook Handler para Safe2Pay
 * Eventos suportados:
 * - SubscriptionCreated: Nova assinatura criada
 * - SubscriptionRenewed: Renovação automática processada
 * - SubscriptionFailed: Falha na cobrança
 * - SubscriptionCanceled: Assinatura cancelada
 * - SubscriptionExpired: Ciclos limite atingido
 */

interface Safe2PayPayload {
  EventType?: string
  IdSubscription?: string
  IdTransaction?: string
  Status?: number // 3 = Pago, 2 = Processando, 1 = Falha
  TransactionStatus?: { Id: number }
  Amount?: number
  AmountDetails?: { TotalAmount: number }
  Reference?: string
  Customer?: {
    Email: string
    Name?: string
    Identity?: string
    Phone?: string
  }
  PaymentMethod?: number
  [key: string]: any
}

async function logWebhookEvent(
  eventType: string,
  idSubscription: string | undefined,
  payload: Safe2PayPayload,
  action: string
) {
  try {
    await supabase.from('webhook_logs').insert({
      provider: 'safe2pay',
      event_type: eventType,
      subscription_id: idSubscription || null,
      payload: payload,
      action_taken: action,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[WEBHOOK] Erro ao logar evento:', error)
  }
}

async function handleSubscriptionCreated(payload: Safe2PayPayload) {
  console.log('[WEBHOOK] SubscriptionCreated:', {
    idSubscription: payload.IdSubscription,
    email: payload.Customer?.Email,
    amount: payload.Amount,
  })

  if (!payload.IdSubscription || !payload.Customer?.Email) {
    throw new Error('IdSubscription ou Customer.Email ausente')
  }

  const email = payload.Customer.Email.toLowerCase()
  const status = payload.TransactionStatus?.Id || payload.Status

  // Se pagamento foi confirmado (status 3 = Pago)
  if (status === 3) {
    // Atualizar perfil do atleta
    const { data: athlete, error: findError } = await supabase
      .from('atletas')
      .select('id, email, academia_id')
      .eq('email', email)
      .single()

    if (findError || !athlete) {
      console.error('[WEBHOOK] Atleta não encontrado:', email)
      await logWebhookEvent(
        'SubscriptionCreated',
        payload.IdSubscription,
        payload,
        'ERRO: Atleta não encontrado'
      )
      return
    }

    // Criar registro de assinatura
    const { error: subscriptionError } = await supabase
      .from('assinaturas')
      .insert({
        atleta_id: athlete.id,
        academia_id: athlete.academia_id,
        id_subscription: payload.IdSubscription,
        valor: payload.Amount || payload.AmountDetails?.TotalAmount || 0,
        status: 'ativo',
        tipo: 'mensal', // Pode vir do plano original
        data_inicio: new Date().toISOString(),
        data_proxima_cobranca: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        eventos: [
          {
            tipo: 'created',
            timestamp: new Date().toISOString(),
            dados: {
              transacao_id: payload.IdTransaction,
              status,
            },
          },
        ],
      })

    if (subscriptionError) {
      console.error('[WEBHOOK] Erro ao criar assinatura:', subscriptionError)
      await logWebhookEvent(
        'SubscriptionCreated',
        payload.IdSubscription,
        payload,
        `ERRO: ${subscriptionError.message}`
      )
      return
    }

    // Marcar pedidos pendentes como "assinado"
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('pedido_id')
      .eq('atleta_id', athlete.id)
      .eq('status', 'pendente')
      .limit(1)

    if (pedidos?.length) {
      await supabase
        .from('pedidos')
        .update({ status: 'aprovado', subscription_id: payload.IdSubscription })
        .eq('pedido_id', pedidos[0].pedido_id)
    }

    await logWebhookEvent(
      'SubscriptionCreated',
      payload.IdSubscription,
      payload,
      `SUCCESS: Assinatura criada para ${athlete.id}`
    )
  }
}

async function handleSubscriptionRenewed(payload: Safe2PayPayload) {
  console.log('[WEBHOOK] SubscriptionRenewed:', {
    idSubscription: payload.IdSubscription,
    amount: payload.Amount,
  })

  if (!payload.IdSubscription) {
    throw new Error('IdSubscription ausente')
  }

  const status = payload.TransactionStatus?.Id || payload.Status

  if (status === 3) {
    // Encontrar assinatura
    const { data: assinatura, error: findError } = await supabase
      .from('assinaturas')
      .select('id, atleta_id, academia_id, eventos')
      .eq('id_subscription', payload.IdSubscription)
      .single()

    if (findError || !assinatura) {
      console.error('[WEBHOOK] Assinatura não encontrada:', payload.IdSubscription)
      await logWebhookEvent(
        'SubscriptionRenewed',
        payload.IdSubscription,
        payload,
        'ERRO: Assinatura não encontrada'
      )
      return
    }

    // Adicionar evento de renovação
    const eventos = assinatura.eventos || []
    eventos.push({
      tipo: 'renewed',
      timestamp: new Date().toISOString(),
      dados: {
        transacao_id: payload.IdTransaction,
        valor: payload.Amount || payload.AmountDetails?.TotalAmount || 0,
        status,
      },
    })

    // Atualizar assinatura
    const { error: updateError } = await supabase
      .from('assinaturas')
      .update({
        status: 'ativo',
        data_proxima_cobranca: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        eventos,
        updated_at: new Date().toISOString(),
      })
      .eq('id_subscription', payload.IdSubscription)

    if (updateError) {
      console.error('[WEBHOOK] Erro ao renovar assinatura:', updateError)
      await logWebhookEvent(
        'SubscriptionRenewed',
        payload.IdSubscription,
        payload,
        `ERRO: ${updateError.message}`
      )
      return
    }

    await logWebhookEvent(
      'SubscriptionRenewed',
      payload.IdSubscription,
      payload,
      `SUCCESS: Assinatura renovada`
    )
  }
}

async function handleSubscriptionFailed(payload: Safe2PayPayload) {
  console.log('[WEBHOOK] SubscriptionFailed:', {
    idSubscription: payload.IdSubscription,
    email: payload.Customer?.Email,
  })

  if (!payload.IdSubscription) {
    throw new Error('IdSubscription ausente')
  }

  // Encontrar assinatura
  const { data: assinatura, error: findError } = await supabase
    .from('assinaturas')
    .select('id, atleta_id, eventos')
    .eq('id_subscription', payload.IdSubscription)
    .single()

  if (findError || !assinatura) {
    console.warn('[WEBHOOK] Assinatura não encontrada para falha:', payload.IdSubscription)
    await logWebhookEvent(
      'SubscriptionFailed',
      payload.IdSubscription,
      payload,
      'AVISO: Assinatura não encontrada'
    )
    return
  }

  // Adicionar evento de falha
  const eventos = assinatura.eventos || []
  eventos.push({
    tipo: 'failed',
    timestamp: new Date().toISOString(),
    dados: {
      motivo: payload.Reference || 'Falha na cobrança',
      transacao_id: payload.IdTransaction,
    },
  })

  // Marcar como suspenso (ainda ativa mas com alerta)
  const { error: updateError } = await supabase
    .from('assinaturas')
    .update({
      status: 'suspenso',
      eventos,
      updated_at: new Date().toISOString(),
    })
    .eq('id_subscription', payload.IdSubscription)

  if (updateError) {
    console.error('[WEBHOOK] Erro ao marcar falha:', updateError)
    await logWebhookEvent(
      'SubscriptionFailed',
      payload.IdSubscription,
      payload,
      `ERRO: ${updateError.message}`
    )
    return
  }

  await logWebhookEvent(
    'SubscriptionFailed',
    payload.IdSubscription,
    payload,
    `SUCCESS: Assinatura marcada como suspenso`
  )
}

async function handleSubscriptionCanceled(payload: Safe2PayPayload) {
  console.log('[WEBHOOK] SubscriptionCanceled:', {
    idSubscription: payload.IdSubscription,
  })

  if (!payload.IdSubscription) {
    throw new Error('IdSubscription ausente')
  }

  // Encontrar assinatura
  const { data: assinatura, error: findError } = await supabase
    .from('assinaturas')
    .select('id, eventos')
    .eq('id_subscription', payload.IdSubscription)
    .single()

  if (findError || !assinatura) {
    console.warn('[WEBHOOK] Assinatura não encontrada para cancelamento:', payload.IdSubscription)
    await logWebhookEvent(
      'SubscriptionCanceled',
      payload.IdSubscription,
      payload,
      'AVISO: Assinatura não encontrada'
    )
    return
  }

  // Adicionar evento de cancelamento
  const eventos = assinatura.eventos || []
  eventos.push({
    tipo: 'canceled',
    timestamp: new Date().toISOString(),
    dados: {
      motivo: payload.Reference || 'Cancelado pelo usuário',
    },
  })

  // Marcarkill como cancelado
  const { error: updateError } = await supabase
    .from('assinaturas')
    .update({
      status: 'cancelado',
      data_cancelamento: new Date().toISOString(),
      eventos,
      updated_at: new Date().toISOString(),
    })
    .eq('id_subscription', payload.IdSubscription)

  if (updateError) {
    console.error('[WEBHOOK] Erro ao cancelar:', updateError)
    await logWebhookEvent(
      'SubscriptionCanceled',
      payload.IdSubscription,
      payload,
      `ERRO: ${updateError.message}`
    )
    return
  }

  await logWebhookEvent(
    'SubscriptionCanceled',
    payload.IdSubscription,
    payload,
    `SUCCESS: Assinatura cancelada`
  )
}

async function handleSubscriptionExpired(payload: Safe2PayPayload) {
  console.log('[WEBHOOK] SubscriptionExpired:', {
    idSubscription: payload.IdSubscription,
  })

  if (!payload.IdSubscription) {
    throw new Error('IdSubscription ausente')
  }

  // Encontrar assinatura
  const { data: assinatura, error: findError } = await supabase
    .from('assinaturas')
    .select('id, eventos')
    .eq('id_subscription', payload.IdSubscription)
    .single()

  if (findError || !assinatura) {
    console.warn('[WEBHOOK] Assinatura não encontrada para expiração:', payload.IdSubscription)
    await logWebhookEvent(
      'SubscriptionExpired',
      payload.IdSubscription,
      payload,
      'AVISO: Assinatura não encontrada'
    )
    return
  }

  // Adicionar evento de expiração
  const eventos = assinatura.eventos || []
  eventos.push({
    tipo: 'expired',
    timestamp: new Date().toISOString(),
    dados: {
      motivo: 'Ciclos limite atingido',
    },
  })

  // Marcar como expirado
  const { error: updateError } = await supabase
    .from('assinaturas')
    .update({
      status: 'expirado',
      eventos,
      updated_at: new Date().toISOString(),
    })
    .eq('id_subscription', payload.IdSubscription)

  if (updateError) {
    console.error('[WEBHOOK] Erro ao expirar:', updateError)
    await logWebhookEvent(
      'SubscriptionExpired',
      payload.IdSubscription,
      payload,
      `ERRO: ${updateError.message}`
    )
    return
  }

  await logWebhookEvent(
    'SubscriptionExpired',
    payload.IdSubscription,
    payload,
    `SUCCESS: Assinatura expirada`
  )
}

export async function POST(request: NextRequest) {
  try {
    const payload: Safe2PayPayload = await request.json()

    console.log('[WEBHOOK] Recebido de Safe2Pay:', {
      eventType: payload.EventType,
      idSubscription: payload.IdSubscription,
      customer: payload.Customer?.Email,
    })

    // Rotear para handler específico
    switch (payload.EventType) {
      case 'SubscriptionCreated':
        await handleSubscriptionCreated(payload)
        break
      case 'SubscriptionRenewed':
        await handleSubscriptionRenewed(payload)
        break
      case 'SubscriptionFailed':
        await handleSubscriptionFailed(payload)
        break
      case 'SubscriptionCanceled':
        await handleSubscriptionCanceled(payload)
        break
      case 'SubscriptionExpired':
        await handleSubscriptionExpired(payload)
        break
      default:
        console.warn('[WEBHOOK] Evento desconhecido:', payload.EventType)
        await logWebhookEvent(
          payload.EventType || 'UNKNOWN',
          payload.IdSubscription,
          payload,
          'AVISO: Tipo de evento desconhecido'
        )
    }

    return NextResponse.json({ success: true, processed: true })
  } catch (error) {
    console.error('[WEBHOOK] Erro ao processar:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
