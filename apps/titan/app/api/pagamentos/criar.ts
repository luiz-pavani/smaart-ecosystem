// app/api/pagamentos/criar.ts - SPRINT 1A
// Criar novo pedido de pagamento
// COPIE E COLE TUDO ISTO:

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CriarPagamentoSchema } from '@/lib/schemas/pagamentos'
import { safe2pay } from '@/lib/integrations/safe2pay'

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

    // 1. Validar request
    const body = await req.json()
    const validacao = CriarPagamentoSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const { academia_id, atleta_id, valor, descricao, metodo_pagamento, data_vencimento } = validacao.data

    // 2. Verificar se atleta existe e pertence à academia
    const { data: atleta, error: erroAtleta } = await supabase
      .from('atletas')
      .select('id, nome_completo, email, cpf')
      .eq('id', atleta_id)
      .eq('academia_id', academia_id)
      .single()

    if (erroAtleta || !atleta) {
      return NextResponse.json(
        { erro: 'Atleta não encontrado ou não pertence a esta academia' },
        { status: 404 }
      )
    }

    // 3. Criar referência única do pedido
    const pedido_id = crypto.randomUUID()
    const safe2pay_reference = `PED-${academia_id.slice(0, 8)}-${atleta_id.slice(0, 8)}-${Date.now()}`

    // 4. Criar pedido em Safe2Pay (ou mock em sandbox)
    let safe2pay_result = null
    
    if (process.env.NEXT_PUBLIC_USE_SAFE2PAY !== 'false') {
      try {
        safe2pay_result = await safe2pay.criarPedido({
          reference: safe2pay_reference,
          amount: Math.round(valor * 100), // converter para centavos
          dueDate: data_vencimento,
          customer: {
            name: atleta.nome_completo,
            email: atleta.email || 'nao-informado@example.com',
            document: atleta.cpf || '00000000000',
          },
          payment: {
            method: metodo_pagamento as 'boleto' | 'pix' | 'creditCard',
          },
        })
      } catch (erro) {
        console.error('Erro Safe2Pay:', erro)
        return NextResponse.json(
          { erro: 'Erro ao processar pagamento com Safe2Pay' },
          { status: 500 }
        )
      }
    }

    // 5. Inserir pedido no banco
    const { data: pedido, error: erroPedido } = await supabase
      .from('pedidos')
      .insert({
        id: pedido_id,
        academia_id,
        atleta_id,
        valor,
        descricao,
        status: 'processando',
        metodo_pagamento,
        safe2pay_reference,
        safe2pay_transaction_id: safe2pay_result?.id || null,
        data_vencimento,
        mes_ref: data_vencimento.substring(0, 7), // "2026-03"
      })
      .select()
      .single()

    if (erroPedido) {
      console.error('Erro ao inserir pedido:', erroPedido)
      return NextResponse.json(
        { erro: 'Erro ao criar pedido no banco de dados' },
        { status: 500 }
      )
    }

    // 6. Log de sucesso
    await supabase.from('webhooks_log').insert({
      provider: 'safe2pay',
      tipo_evento: 'pedido_criado',
      payload: { pedido_id, safe2pay_reference },
      status_processamento: 'sucesso',
    })

    // 7. Responder com sucesso
    return NextResponse.json(
      {
        success: true,
        pedido_id,
        safe2pay_reference,
        status: 'processando',
        link_pagamento: safe2pay_result?.checkoutUrl || null,
        qr_code_pix: safe2pay_result?.qrCode || null,
      },
      { status: 201 }
    )
  } catch (erro) {
    console.error('Erro ao criar pedido:', erro)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

