import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
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

    if (!allowed) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const { data, error } = await supabaseAdmin
      .from('profile_audit_log')
      .select('id, actor_nome, action, fields, created_at')
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ logs: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
