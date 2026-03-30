import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import jwt from 'jsonwebtoken'

const SSO_SECRET = process.env.TITAN_SSO_SECRET!

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Check candidato with CONFIRMADO + APROVADO
  const { data: inscricao } = await supabaseAdmin
    .from('candidato_inscricoes')
    .select('status_inscricao, status_pagamento, graduacao_pretendida')
    .eq('stakeholder_id', user.id)
    .single()

  if (!inscricao ||
    inscricao.status_inscricao !== 'CONFIRMADO' ||
    inscricao.status_pagamento !== 'APROVADO') {
    return NextResponse.json({ error: 'Acesso não autorizado ao Profep MAX' }, { status: 403 })
  }

  const { data: st } = await supabaseAdmin
    .from('stakeholders')
    .select('nome_completo, email, nome_usuario')
    .eq('id', user.id)
    .single()

  const token = jwt.sign(
    {
      sub: user.id,
      email: st?.email || user.email,
      nome_completo: st?.nome_completo,
      nome_usuario: st?.nome_usuario,
      graduacao_pretendida: inscricao.graduacao_pretendida,
    },
    SSO_SECRET,
    { expiresIn: '10m' }
  )

  return NextResponse.json({ token })
}
