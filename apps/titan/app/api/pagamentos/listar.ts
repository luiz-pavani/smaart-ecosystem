import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY

    if (!url || !key) {
      return NextResponse.json({ pedidos: [] })
    }

    const supabase = createClient(url, key)

    // Buscar todos os pedidos (com info de academia e atleta)
    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select(`
        pedido_id,
        valor,
        status,
        metodo_pagamento,
        data_criacao,
        academia:academias(sigla),
        atleta:atletas(nome)
      `)
      .order('data_criacao', { ascending: false })
      .limit(50)

    if (error) {
      console.log('Erro ao buscar pedidos:', error.message)
      return NextResponse.json({ pedidos: [] })
    }

    // Formatar resposta
    const pedidosFormatados = (pedidos || []).map((p: any) => ({
      pedido_id: p.pedido_id,
      academia_sigla: p.academia?.sigla || '?',
      atleta_nome: p.atleta?.nome || 'Desconhecido',
      valor: p.valor,
      status: p.status,
      metodo_pagamento: p.metodo_pagamento,
      data_criacao: p.data_criacao,
    }))

    return NextResponse.json({ pedidos: pedidosFormatados })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ pedidos: [] })
  }
}
