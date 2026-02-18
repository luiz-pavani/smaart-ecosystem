// app/api/webhooks/safe2pay/route.ts - SPRINT 1A
// Receber confirmações de pagamento de Safe2Pay
// COPIE E COLE TUDO ISTO:

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function POST(req: NextRequest) {
  try {
    // Check supabase is initialized
    if (!supabase) {
      return NextResponse.json(
        { erro: 'Supabase não configurado' },
        { status: 500 }
      )
    }
    const webhookSecret = process.env.SAFE2PAY_WEBHOOK_SECRET
    const signature = req.headers.get('x-safe2pay-signature')

    if (webhookSecret && signature && !validarSignature(await req.text(), signature, webhookSecret)) {
      return NextResponse.json(
        { erro: 'Assinatura inválida' },
        { status: 401 }
      )
    }

    const payload = await req.json()

    // 2. Extrair dados do webhook
    const { reference, status, transaction_id, amount } = payload

    console.log(`[Webhook Safe2Pay] Reference: ${reference}, Status: ${status}`)

    // 3. Log do webhook recebido
    await supabase.from('webhooks_log').insert({
      provider: 'safe2pay',
      tipo_evento: 'payment_' + status,
      payload,
      status_processamento: 'processando',
    })

    // 4. Buscar pedido
    const { data: pedido, error: erroPedido } = await supabase
      .from('pedidos')
      .select('id, academia_id, atleta_id, valor')
      .eq('safe2pay_reference', reference)
      .single()

    if (erroPedido || !pedido) {
      console.error('Pedido não encontrado:', reference)
      return NextResponse.json(
        { erro: 'Pedido não encontrado', received: true },
        { status: 404 }
      )
    }

    // 5. Atualizar status do pedido
    let novo_status = 'pendente'
    if (status === 'approved' || status === 'PAID') {
      novo_status = 'aprovado'
    } else if (status === 'declined' || status === 'FAILED') {
      novo_status = 'recusado'
    }

    const { error: erroUpdate } = await supabase
      .from('pedidos')
      .update({
        status: novo_status,
        safe2pay_transaction_id: transaction_id,
        data_pagamento: novo_status === 'aprovado' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedido.id)

    if (erroUpdate) {
      console.error('Erro ao atualizar pedido:', erroUpdate)
      return NextResponse.json(
        { erro: 'Erro ao atualizar pedido', received: true },
        { status: 500 }
      )
    }

    // 6. Se pagamento aprovado, atualizar academia
    if (novo_status === 'aprovado') {
      const { error: erroAcademia } = await supabase
        .from('academias')
        .update({
          plan_status: 'active',
          plan_expire_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', pedido.academia_id)

      if (erroAcademia) {
        console.error('Erro ao atualizar academia:', erroAcademia)
      }

      // Enviar notificação (TODO: Firebase Cloud Messaging)
      console.log(`[Notificação] Pagamento aprovado para atleta ${pedido.atleta_id}`)
    }

    // 7. Se recusado, registrar tentativa de recobrança
    if (novo_status === 'recusado') {
      const { error: erroEvent } = await supabase
        .from('inadimplencia_eventos')
        .insert({
          pedido_id: pedido.id,
          evento: 'pagamento_recusado',
          motivo: `Safe2Pay status: ${status}`,
        })

      if (erroEvent) {
        console.error('Erro ao registrar evento inadimplência:', erroEvent)
      }
    }

    // 8. Log de sucesso
    await supabase.from('webhooks_log').update({
      status_processamento: 'sucesso',
    }).eq('payload->>reference', reference)

    return NextResponse.json(
      { success: true, reference, novo_status },
      { status: 200 }
    )
  } catch (erro) {
    console.error('Erro ao processar webhook:', erro)
    return NextResponse.json(
      { erro: 'Erro interno', received: true },
      { status: 500 }
    )
  }
}

// Função para validar assinatura (TODO: implementar com crypto)
function validarSignature(payload: string, signature: string, secret: string): boolean {
  // Em produção, validar HMAC
  // import { createHmac } from 'crypto'
  // const hash = createHmac('sha256', secret).update(payload).digest('hex')
  // return hash === signature
  return true // TODO: implementar
}

