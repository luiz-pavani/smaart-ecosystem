import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * PATCH /api/atletas/self/cpf
 * Body: { cpf: "12345678901" }
 *
 * Atleta atualiza próprio CPF. Necessário pra Safe2Pay no checkout.
 */
function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false  // 11111111111, 22222222222 etc

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
  let d1 = 11 - (sum % 11); if (d1 >= 10) d1 = 0
  if (d1 !== parseInt(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i)
  let d2 = 11 - (sum % 11); if (d2 >= 10) d2 = 0
  if (d2 !== parseInt(cpf[10])) return false

  return true
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const cpfRaw = String(body.cpf || '')
  const cpf = cpfRaw.replace(/\D/g, '')

  if (!isValidCPF(cpf)) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('stakeholders')
    .update({ cpf })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, cpf })
}
