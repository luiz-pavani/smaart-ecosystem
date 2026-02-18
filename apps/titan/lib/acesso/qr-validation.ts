// lib/acesso/qr-validation.ts - SPRINT 1B
// Validação de tokens JWT para QR Codes
// COPIE E COLE TUDO ISTO:

import jwt from 'jsonwebtoken'

const QR_SECRET = process.env.QR_SECRET_KEY || 'sua-chave-segura-aqui-nao-use-em-producao'

export interface QRTokenPayload {
  atleta_id: string
  academia_id: string
  timestamp: number
  iat: number
  exp: number
}

export class QRValidator {
  // Gerar token JWT para QR Code
  gerarToken(atleta_id: string, academia_id: string, validade_horas: number = 24): string {
    const now = Math.floor(Date.now() / 1000)
    const expiracao = now + validade_horas * 3600

    const token = jwt.sign(
      {
        atleta_id,
        academia_id,
        timestamp: now,
      },
      QR_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: validade_horas * 3600,
      }
    )

    return token
  }

  // Validar token JWT do QR
  validarToken(token: string): { valido: boolean; payload?: QRTokenPayload; erro?: string } {
    try {
      const payload = jwt.verify(token, QR_SECRET) as QRTokenPayload
      return { valido: true, payload }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valido: false, erro: 'QR expirado' }
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valido: false, erro: 'QR inválido' }
      }
      return { valido: false, erro: 'Erro ao validar QR' }
    }
  }

  // Decodificar token sem validar (apenas ler payload)
  decodificar(token: string): QRTokenPayload | null {
    try {
      return jwt.decode(token) as QRTokenPayload
    } catch {
      return null
    }
  }
}

export const qrValidator = new QRValidator()

