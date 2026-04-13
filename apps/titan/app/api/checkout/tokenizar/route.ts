import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tokenizeCard } from '@/lib/safe2pay'

/**
 * POST /api/checkout/tokenizar
 * Tokeniza um cartão de crédito na Safe2Pay.
 * Dados sensíveis nunca são persistidos.
 *
 * Body: { cardNumber, holderName, expirationDate, securityCode }
 * Retorna: { token }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { cardNumber, holderName, expirationDate, securityCode } = await req.json()

  if (!cardNumber || !holderName || !expirationDate || !securityCode) {
    return NextResponse.json({ error: 'Dados do cartão incompletos' }, { status: 400 })
  }

  const result = await tokenizeCard({ cardNumber, holderName, expirationDate, securityCode })

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ token: result.token })
}
