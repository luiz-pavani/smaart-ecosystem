import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qr_token, academia_id } = body

    if (!qr_token || !academia_id) {
      return NextResponse.json(
        { erro: 'qr_token e academia_id são obrigatórios' },
        { status: 400 }
      )
    }

    // Mock: em produção, verificar com JWT real
    // Por enquanto, apenas validar que token existe

    if (!qr_token.startsWith('MOCK-TOKEN-')) {
      return NextResponse.json(
        { erro: 'QR inválido' },
        { status: 403 }
      )
    }

    // Mock: simular sucesso
    return NextResponse.json(
      {
        status: 'autorizado',
        mensagem: 'Check-in realizado',
        hora_entrada: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { erro: 'Erro ao fazer check-in' },
      { status: 500 }
    )
  }
}
