import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
}

// Gera uma senha segura interna (o usuário nunca a vê — login é sempre via OTP)
function generateInternalPassword(): string {
  return crypto.randomBytes(32).toString('hex')
}

// POST — verifica OTP e cria/autentica o usuário
// Body: { telefone, code, nomeCompleto, nomeUsuario, funcao }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { telefone, code, nomeCompleto, nomeUsuario, funcao } = body

  const phone = normalizePhone(telefone || '')
  if (!phone || !code) {
    return NextResponse.json({ error: 'Telefone e código são obrigatórios' }, { status: 400 })
  }

  // Buscar OTP válido (não usado, não expirado)
  const { data: otp, error: otpError } = await supabaseAdmin
    .from('otp_verifications')
    .select('id, code')
    .eq('telefone', phone)
    .eq('code', code)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (otpError || !otp) {
    return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 401 })
  }

  // Marcar OTP como usado
  await supabaseAdmin
    .from('otp_verifications')
    .update({ used: true })
    .eq('id', otp.id)

  const fakeEmail = `${phone}@whatsapp.titan.app`

  // Verificar se já existe stakeholder com este telefone
  const { data: existingStakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('id, email')
    .eq('telefone', phone)
    .maybeSingle()

  if (existingStakeholder) {
    // Usuário já existe — buscar auth user e gerar sessão
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(existingStakeholder.id)
    const email = authUser?.user?.email

    if (email) {
      // Setar senha temporária e fazer login com ela
      const tempPassword = generateInternalPassword()
      await supabaseAdmin.auth.admin.updateUser(existingStakeholder.id, { password: tempPassword })

      const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password: tempPassword,
      })

      if (signInError || !session.session) {
        return NextResponse.json({ error: 'Erro ao gerar sessão' }, { status: 500 })
      }

      return NextResponse.json({
        ok: true,
        action: 'login',
        access_token: session.session.access_token,
        refresh_token: session.session.refresh_token,
      })
    }
  }

  // Novo cadastro — precisamos dos dados completos
  if (!nomeCompleto?.trim() || !nomeUsuario?.trim() || !funcao) {
    return NextResponse.json({ error: 'Dados de cadastro incompletos', action: 'need_signup_data' }, { status: 400 })
  }

  const sanitizedUsername = nomeUsuario.trim().toLowerCase().replace(/\s+/g, '')

  // Verificar username único
  const { data: usernameExists } = await supabaseAdmin
    .from('stakeholders')
    .select('id')
    .eq('nome_usuario', sanitizedUsername)
    .maybeSingle()

  if (usernameExists) {
    return NextResponse.json({ error: 'Nome de usuário já existe' }, { status: 409 })
  }

  // Criar usuário no Supabase Auth (email fictício baseado no telefone)
  const internalPassword = generateInternalPassword()

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: fakeEmail,
    password: internalPassword,
    email_confirm: true,
    user_metadata: {
      full_name: nomeCompleto.trim(),
      username: sanitizedUsername,
      stakeholder_role: funcao,
      phone,
    },
  })

  if (createError) {
    // Se já existe com este email fictício, é login
    if (createError.message?.includes('already been registered')) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const existing = users?.users?.find((u: any) => u.email === fakeEmail)
      if (existing) {
        const tempPassword = generateInternalPassword()
        await supabaseAdmin.auth.admin.updateUser(existing.id, { password: tempPassword })
        const { data: session } = await supabaseAdmin.auth.signInWithPassword({
          email: fakeEmail,
          password: tempPassword,
        })
        if (session?.session) {
          return NextResponse.json({
            ok: true,
            action: 'login',
            access_token: session.session.access_token,
            refresh_token: session.session.refresh_token,
          })
        }
      }
    }
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  // Criar stakeholder
  const { error: stakeholderError } = await supabaseAdmin
    .from('stakeholders')
    .upsert({
      id: newUser.user.id,
      funcao,
      nome_completo: nomeCompleto.trim(),
      nome_usuario: sanitizedUsername,
      telefone: phone,
      email: null,
    }, { onConflict: 'id' })

  if (stakeholderError) {
    console.error('Stakeholder upsert error:', stakeholderError)
  }

  // Login com o novo usuário
  const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: fakeEmail,
    password: internalPassword,
  })

  if (signInError || !session.session) {
    return NextResponse.json({ error: 'Conta criada mas erro ao gerar sessão' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    action: 'signup',
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
  })
}
