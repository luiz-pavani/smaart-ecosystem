import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
