import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { emailResetSenha } from '@/lib/email'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'

/**
 * POST { identifier }
 *
 * Aceita email, telefone ou nome de usuário. Resolve para o email canônico
 * (via stakeholders), gera link de recuperação via supabase.auth.admin
 * e envia por email (Resend). Resposta é genérica para não vazar quem
 * tem ou não conta.
 */
export async function POST(req: NextRequest) {
  const { identifier } = await req.json().catch(() => ({}))
  if (!identifier?.trim()) {
    return NextResponse.json({ error: 'Informe email, telefone ou usuário' }, { status: 400 })
  }

  // Rate-limit por IP e por identifier (mais permissivo que login pois é fluxo
  // legítimo, mas o suficiente para impedir enumeração de massa).
  const ip = getClientIp(req)
  const ipLimit = await rateLimit({
    bucket: 'request-password-reset:ip',
    key: ip,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  })
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSec) } }
    )
  }
  const idLimit = await rateLimit({
    bucket: 'request-password-reset:id',
    key: identifier.toLowerCase().trim(),
    limit: 3,
    windowMs: 10 * 60 * 1000,
  })
  if (!idLimit.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas para este identificador.' },
      { status: 429, headers: { 'Retry-After': String(idLimit.retryAfterSec) } }
    )
  }

  const normalized = identifier.trim()
  const digits = normalized.replace(/\D/g, '')

  // Resolve para stakeholder pelo mesmo método do /api/auth/resolve-identifier
  let stake: { id: string; email: string | null; nome_completo: string | null } | null = null
  if (normalized.includes('@')) {
    const { data } = await supabaseAdmin
      .from('stakeholders')
      .select('id, email, nome_completo')
      .eq('email', normalized)
      .maybeSingle()
    stake = data
  }
  if (!stake && digits.length >= 8) {
    const candidates = new Set<string>([digits])
    if (!digits.startsWith('55')) candidates.add(`55${digits}`)
    for (const phone of candidates) {
      const { data } = await supabaseAdmin
        .from('stakeholders')
        .select('id, email, nome_completo')
        .eq('telefone', phone)
        .maybeSingle()
      if (data) { stake = data; break }
    }
  }
  if (!stake) {
    const username = normalized.toLowerCase().replace(/\s+/g, '')
    const { data } = await supabaseAdmin
      .from('stakeholders')
      .select('id, email, nome_completo')
      .eq('nome_usuario', username)
      .maybeSingle()
    stake = data
  }

  // Resposta uniforme: não confirmamos existência da conta.
  const okResponse = NextResponse.json({
    ok: true,
    message:
      'Se houver uma conta vinculada a esse identificador, enviaremos as instruções por email.',
  })

  if (!stake) return okResponse

  // Obtém o email real do auth (fonte de verdade)
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(stake.id)
  const authEmail = authUser?.user?.email || stake.email
  if (!authEmail) return okResponse // conta sem email — só OTP, não dá pra resetar por email

  // Gera link de recuperação via Supabase Auth Admin
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: authEmail,
    options: {
      redirectTo: `${BASE_URL}/redefinir-senha`,
    },
  })

  if (linkError || !linkData?.properties?.action_link) {
    // mantém resposta genérica
    return okResponse
  }

  await emailResetSenha({
    email: authEmail,
    nome: stake.nome_completo || undefined,
    linkRecuperacao: linkData.properties.action_link,
  })

  return okResponse
}
