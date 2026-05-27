import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST — resolve um identificador (email, telefone ou usuário) para o email de auth
// Body: { identifier }
// Retorna: { authEmail }
export async function POST(req: NextRequest) {
  const { identifier } = await req.json()
  if (!identifier?.trim()) {
    return NextResponse.json({ error: 'Identificador obrigatório' }, { status: 400 })
  }

  const normalized = identifier.trim()

  // Rate-limit:
  //   - por IP: 30 tentativas / 10 min (fluxo de login normal cabe; ataque distribuído trava)
  //   - por identifier: 6 tentativas / 10 min (impede enumeração no mesmo email/telefone)
  const ip = getClientIp(req)
  const ipLimit = await rateLimit({
    bucket: 'resolve-identifier:ip',
    key: ip,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  })
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSec) } }
    )
  }
  const idLimit = await rateLimit({
    bucket: 'resolve-identifier:id',
    key: normalized.toLowerCase(),
    limit: 6,
    windowMs: 10 * 60 * 1000,
  })
  if (!idLimit.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas para este identificador.' },
      { status: 429, headers: { 'Retry-After': String(idLimit.retryAfterSec) } }
    )
  }
  const digits = normalized.replace(/\D/g, '')

  let data: { id: string; email: string | null; telefone: string | null } | null = null

  // 1. Tentar por email
  if (normalized.includes('@')) {
    const { data: byEmail } = await supabaseAdmin
      .from('stakeholders')
      .select('id, email, telefone')
      .eq('email', normalized)
      .maybeSingle()
    data = byEmail
  }

  // 2. Tentar por telefone (vários formatos)
  if (!data && digits.length >= 8) {
    const candidates = new Set<string>()
    candidates.add(digits)
    if (!digits.startsWith('55')) candidates.add(`55${digits}`)
    if (digits.startsWith('55') && digits.length >= 12) candidates.add(digits)

    for (const phone of candidates) {
      const { data: byPhone } = await supabaseAdmin
        .from('stakeholders')
        .select('id, email, telefone')
        .eq('telefone', phone)
        .maybeSingle()
      if (byPhone) { data = byPhone; break }
    }
  }

  // 3. Tentar por nome de usuário
  if (!data) {
    const username = normalized.toLowerCase().replace(/\s+/g, '')
    const { data: byUsername } = await supabaseAdmin
      .from('stakeholders')
      .select('id, email, telefone')
      .eq('nome_usuario', username)
      .maybeSingle()
    data = byUsername
  }

  if (!data) {
    return NextResponse.json({ error: 'Usuário não encontrado. Verifique o email, telefone ou nome de usuário.' }, { status: 404 })
  }

  // Buscar o email real de autenticação direto do auth.users (fonte de verdade)
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(data.id)
  if (authUser?.user?.email) {
    return NextResponse.json({ authEmail: authUser.user.email })
  }

  // Fallback: derivar pelo stakeholder
  if (data.email) return NextResponse.json({ authEmail: data.email })
  if (data.telefone) return NextResponse.json({ authEmail: `${data.telefone}@whatsapp.titan.app` })

  return NextResponse.json({ error: 'Conta sem método de autenticação. Entre em contato com o suporte.' }, { status: 400 })
}
