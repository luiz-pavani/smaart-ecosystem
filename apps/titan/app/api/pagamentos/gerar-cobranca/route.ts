import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      academia_id,
      tipo,
      valor,
      parcelas = 1,
      metodo_pagamento,
      data_vencimento
    } = body

    // Validar dados
    if (!academia_id || !tipo || !valor || !metodo_pagamento) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Buscar academia e federação
    const { data: academia, error: academiaError } = await supabase
      .from('academias')
      .select('*, federacoes!inner(id, sigla, safe2pay_token, safe2pay_sandbox)')
      .eq('id', academia_id)
      .single()

    if (academiaError || !academia) {
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })
    }

    // TODO: Integração real com Safe2Pay
    // Por enquanto, simular resposta
    const mockTransactionId = `MOCK_${Date.now()}`
    const mockPaymentUrl = `https://payment.safe2pay.com.br/${mockTransactionId}`

    // Inserir registro de pagamento
    const { data: pagamento, error: pagamentoError } = await supabase
      .from('pagamentos')
      .insert({
        federacao_id: academia.federacao_id,
        academia_id: academia.id,
        safe2pay_transaction_id: mockTransactionId,
        tipo,
        valor,
        status: 'pending',
        metodo_pagamento,
        data_vencimento,
        descricao: `Anuidade 2026 - ${academia.nome}`,
        metadata: {
          parcelas,
          responsavel_email: academia.responsavel_email,
          responsavel_nome: academia.responsavel_nome
        }
      })
      .select()
      .single()

    if (pagamentoError) {
      console.error('Erro ao inserir pagamento:', pagamentoError)
      return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
    }

    // TODO: Enviar email para responsável
    // await sendPaymentEmail(academia.responsavel_email, mockPaymentUrl)

    return NextResponse.json({
      success: true,
      payment_id: pagamento.id,
      payment_url: mockPaymentUrl,
      transaction_id: mockTransactionId
    })

  } catch (error: any) {
    console.error('Erro ao gerar cobrança:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
