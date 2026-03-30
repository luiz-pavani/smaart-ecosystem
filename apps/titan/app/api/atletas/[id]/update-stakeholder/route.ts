import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ROLES_ALLOWED = ['atleta', 'professor', 'federacao_admin', 'master_access']

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
    const isMaster = callerRole === 'master_access'
    const isSelf = user.id === targetId
    const canEditNomeUsuario = isMaster || isSelf ||
      ['professor', 'federacao_admin'].includes(callerRole)

    if (!canEditNomeUsuario && !isMaster) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await req.json()
    const payload: Record<string, unknown> = {}

    // nome_usuario: editable by self, professor, federacao_admin, master_access
    if ('nome_usuario' in body && canEditNomeUsuario) {
      payload['nome_usuario'] = body.nome_usuario === '' ? null : (body.nome_usuario ?? null)
    }

    // role: only master_access
    if ('role' in body) {
      if (!isMaster) return NextResponse.json({ error: 'Apenas Master Access pode alterar o nível de acesso' }, { status: 403 })
      if (!ROLES_ALLOWED.includes(body.role)) return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
      payload['role'] = body.role
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido enviado' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('stakeholders')
      .update(payload)
      .eq('id', targetId)
      .select('id, nome_usuario, role')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
