import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
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

  // Verificar se já existe stakeholder com este telefone
  const { data: existingStakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('id, email')
    .eq('telefone', phone)
    .maybeSingle()

  if (existingStakeholder) {
    // Usuário já existe — gerar magic link para login
    // Buscar email do auth.users via admin
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(existingStakeholder.id)

    if (authUser?.user?.email) {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: authUser.user.email,
      })

      if (linkError) {
        return NextResponse.json({ error: 'Erro ao gerar sessão' }, { status: 500 })
      }

      // Retornar token properties para login direto no cliente
      return NextResponse.json({
        ok: true,
        action: 'login',
        access_token: linkData.properties?.access_token,
        refresh_token: linkData.properties?.refresh_token,
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
  const fakeEmail = `${phone}@whatsapp.titan.app`

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: fakeEmail,
    email_confirm: true, // auto-confirma (verificação foi via WhatsApp)
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
      const existing = users?.users?.find(u => u.email === fakeEmail)
      if (existing) {
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: fakeEmail,
        })
        return NextResponse.json({
          ok: true,
          action: 'login',
          access_token: linkData?.properties?.access_token,
          refresh_token: linkData?.properties?.refresh_token,
        })
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

  // Gerar sessão para o novo usuário
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: fakeEmail,
  })

  if (linkError) {
    return NextResponse.json({ error: 'Conta criada mas erro ao gerar sessão' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    action: 'signup',
    access_token: linkData.properties?.access_token,
    refresh_token: linkData.properties?.refresh_token,
  })
}
