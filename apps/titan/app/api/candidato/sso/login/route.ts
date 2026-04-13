import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import jwt from 'jsonwebtoken'

const SSO_SECRET = process.env.TITAN_SSO_SECRET!

// Validate Titan credentials and return an SSO JWT for ProfepMax
// Accepts: { identifier: email | nome_usuario | telefone, password }
export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json()
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identificador e senha obrigatórios' }, { status: 400 })
    }

    // Resolve email from identifier (can be email, nome_usuario, or phone)
    let email = identifier as string

    const isEmail = identifier.includes('@')
    if (!isEmail) {
      // Look up by nome_usuario or telefone
      const { data: st } = await supabaseAdmin
        .from('stakeholders')
        .select('email')
        .or(`nome_usuario.eq.${identifier},telefone.eq.${identifier}`)
        .maybeSingle()

      if (!st?.email) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
      }
      email = st.email
    }

    // Sign in with Supabase to verify password
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // Check candidato access
    const { data: st } = await supabaseAdmin
      .from('stakeholders')
      .select('nome_completo, nome_usuario, telefone, candidato')
      .eq('id', authData.user.id)
      .single()

    if (!st?.candidato) {
      return NextResponse.json({ error: 'Sem acesso ao Profep MAX. Entre em contato com a secretaria.' }, { status: 403 })
    }

    const token = jwt.sign(
      {
        sub: authData.user.id,
        email,
        nome_completo: st.nome_completo,
        nome_usuario: st.nome_usuario,
        telefone: st.telefone,
      },
      SSO_SECRET,
      { expiresIn: '10m' }
    )

    return NextResponse.json({ token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
