import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Cria/atualiza um usuário e atribui role=master_access.
 *
 * Autorização:
 * - chamada autenticada por um usuário que já é master_access, OU
 * - chamada com header `x-admin-bootstrap-secret` igual a process.env.ADMIN_BOOTSTRAP_SECRET
 *   (apenas para bootstrap inicial, quando ainda não existe nenhum master).
 */
export async function POST(request: NextRequest) {
  try {
    // --- Autorização ----------------------------------------------------
    const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET
    const providedSecret = request.headers.get('x-admin-bootstrap-secret')

    let authorized = false

    if (bootstrapSecret && providedSecret && bootstrapSecret === providedSecret) {
      authorized = true
    } else {
      // Caminho normal: caller precisa estar autenticado e ser master_access
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      }
      const { data: stake } = await supabaseAdmin
        .from('stakeholders')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (stake?.role === 'master_access') authorized = true
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'Acesso restrito a master_access' },
        { status: 403 }
      )
    }

    // --- Lógica original ------------------------------------------------
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })

    if (authError && !authError.message?.includes('already exists')) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    let userId = authData?.user?.id
    if (!userId) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      userId = users?.users?.find((u) => u.email === email)?.id
      if (userId) {
        await supabaseAdmin.auth.admin.updateUserById(userId, { password })
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Could not get user ID' }, { status: 400 })
    }

    const { error: roleError } = await supabaseAdmin
      .from('stakeholders')
      .update({
        role: 'master_access',
        federacao_id: null,
        academia_id: null,
      })
      .eq('id', userId)

    if (roleError) {
      return NextResponse.json(
        { error: `Could not assign role: ${roleError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, userId }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
