import { NextRequest, NextResponse } from 'next/server'

// Simples geração de JWT sem dependências (just voor demo)
// Em produção, instale: npm install jsonwebtoken

export async function GET(request: NextRequest) {
  try {
    // Por enquanto, gera um token mock
    // Dev 2 vai instalar jsonwebtoken e implementar JWT real
    
    const atleta_id = request.nextUrl.searchParams.get('atleta_id')
    const academia_id = request.nextUrl.searchParams.get('academia_id')

    if (!atleta_id || !academia_id) {
      return NextResponse.json(
        { erro: 'atleta_id e academia_id são obrigatórios' },
        { status: 400 }
      )
    }

    // Mock token (Dev 2: substitua com JWT real)
    const qr_token = `MOCK-TOKEN-${Date.now()}`
    
    // Mock QR code como dataURL (Dev 2: substitua com qrcode library)
    const qr_image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    return NextResponse.json(
      {
        sucesso: true,
        qr_token,
        qr_image,
        atleta_id,
        academia_id,
        validade_ate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { erro: 'Erro ao gerar QR' },
      { status: 500 }
    )
  }
}
