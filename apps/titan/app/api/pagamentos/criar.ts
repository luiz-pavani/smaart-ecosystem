import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY

    if (!url || !key) {
      return NextResponse.json(
        { erro: 'Configuração faltando' },
        { status: 500 }
      )
    }

    const supabase = createClient(url, key)
    const body = await request.json()

    const { academia_id, atleta_id, valor, metodo_pagamento } = body

    // Validações básicas
    if (!academia_id || !atleta_id || !valor || !metodo_pagamento) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: academia_id, atleta_id, valor, metodo_pagamento' },
        { status: 400 }
      )
    }

    // 1. Verificar se academia existe
    const { data: academia } = await supabase
      .from('academias')
      .select('academia_id')
      .eq('academia_id', academia_id)
      .single()

    if (!academia) {
      return NextResponse.json(
        { erro: 'Academia não encontrada' },
        { status: 404 }
      )
    }

    // 2. Verificar se atleta existe
    const { data: atleta } = await supabase
      .from('atletas')
      .select('atleta_id')
      .eq('atleta_id', atleta_id)
      .single()

    if (!atleta) {
      return NextResponse.json(
        { erro: 'Atleta não encontrado' },
        { status: 404 }
      )
    }

    // 3. Criar pedido
    const pedido_id = crypto.randomUUID()
    
    const { error: insertError } = await supabase
      .from('pedidos')
      .insert([
        {
          pedido_id,
          academia_id,
          atleta_id,
          valor,
          metodo_pagamento,
          status: 'pendente',
          data_criacao: new Date().toISOString(),
        },
      ])

    if (insertError) {
      console.error('Erro ao inserir pedido:', insertError)
      return NextResponse.json(
        { erro: 'Erro ao criar pedido' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        sucesso: true,
        pedido_id,
        status: 'pendente',
        valor,
        metodo_pagamento,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
