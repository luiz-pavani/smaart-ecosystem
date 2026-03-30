import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetId } = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: caller } = await supabaseAdmin
      .from('stakeholders')
      .select('role')
      .eq('id', user.id)
      .single()

    const callerRole = caller?.role ?? ''
    const isSelf = user.id === targetId
    const allowed = isSelf || ['professor', 'federacao_admin', 'master_access'].includes(callerRole)

    if (!allowed) {
      return NextResponse.json({ error: 'Sem permissão para alterar esta senha' }, { status: 403 })
    }

    const { password } = await req.json()
    if (!password || String(password).length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
