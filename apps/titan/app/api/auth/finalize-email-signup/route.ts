import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST — cria o registro stakeholder após email signup
// Body: { userId, funcao, nomeCompleto, nomeUsuario, email }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, funcao, nomeCompleto, nomeUsuario, email } = body

  if (!userId || !funcao || !nomeCompleto?.trim() || !nomeUsuario?.trim()) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Verificar que o userId realmente existe no Auth (evitar criação arbitrária)
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (authError || !authUser?.user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const sanitizedUsername = nomeUsuario.trim().toLowerCase().replace(/\s+/g, '')

  // Verificar username único
  const { data: usernameExists } = await supabaseAdmin
    .from('stakeholders')
    .select('id')
    .eq('nome_usuario', sanitizedUsername)
    .neq('id', userId)
    .maybeSingle()

  if (usernameExists) {
    return NextResponse.json({ error: 'Nome de usuário já está em uso' }, { status: 409 })
  }

  const { error: upsertError } = await supabaseAdmin
    .from('stakeholders')
    .upsert({
      id: userId,
      funcao,
      nome_completo: nomeCompleto.trim(),
      nome_usuario: sanitizedUsername,
      email: email?.trim() || authUser.user.email || null,
    }, { onConflict: 'id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
