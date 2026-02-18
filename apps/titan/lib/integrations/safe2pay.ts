// lib/integrations/safe2pay.ts - SPRINT 1A
// Cliente Safe2Pay para criar pedidos
// COPIE E COLE TUDO ISTO:

const SAFE2PAY_API_URL = process.env.SAFE2PAY_API_URL || 'https://api.safe2pay.com.br/v1'
const SAFE2PAY_MERCHANT_KEY = process.env.SAFE2PAY_MERCHANT_KEY
const SAFE2PAY_API_KEY = process.env.SAFE2PAY_API_KEY

export interface Safe2PayOrderRequest {
  reference: string // Seu ID único (pedido_id)
  amount: number // Valor em centavos (50000 = R$ 500.00)
  dueDate: string // "2026-03-15"
  customer: {
    name: string
    email: string
    document: string // CPF
  }
  payment?: {
    method: 'boleto' | 'creditCard' | 'pix' // método
  }
}

export interface Safe2PayOrderResponse {
  id: string
  reference: string
  amount: number
  status: string
  checkoutUrl?: string
  qrCode?: string
}

export class Safe2PayClient {
  async criarPedido(dados: Safe2PayOrderRequest): Promise<Safe2PayOrderResponse> {
    if (!SAFE2PAY_API_KEY || !SAFE2PAY_MERCHANT_KEY) {
      throw new Error('Safe2Pay credentials não configuradas')
    }

    try {
      const response = await fetch(`${SAFE2PAY_API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SAFE2PAY_API_KEY}`,
          'X-Merchant-Key': SAFE2PAY_MERCHANT_KEY,
        },
        body: JSON.stringify({
          reference: dados.reference,
          amount: dados.amount,
          dueDate: dados.dueDate,
          customer: dados.customer,
          payment: dados.payment || { method: 'pix' },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Safe2Pay Error: ${error.message}`)
      }

      const result: Safe2PayOrderResponse = await response.json()
      return result
    } catch (error) {
      console.error('Safe2Pay Error:', error)
      throw error
    }
  }

  async verificarStatusPedido(reference: string): Promise<{ status: string }> {
    if (!SAFE2PAY_API_KEY) {
      throw new Error('Safe2Pay credentials não configuradas')
    }

    const response = await fetch(`${SAFE2PAY_API_URL}/transactions/${reference}`, {
      headers: {
        'Authorization': `Bearer ${SAFE2PAY_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Safe2Pay Error: ${response.statusText}`)
    }

    return response.json()
  }

  // Validar webhook assinado pelo Safe2Pay
  validarWebhook(payload: string, signature: string): boolean {
    // TODO: Implementar HMAC validation
    // Safe2Pay envia X-Signature header
    // Você recalcula HMAC(payload, secret) e compara
    return signature === this.calcularSignature(payload)
  }

  private calcularSignature(payload: string): string {
    // TODO: Implementar com crypto.createHmac
    return ''
  }
}

export const safe2pay = new Safe2PayClient()

