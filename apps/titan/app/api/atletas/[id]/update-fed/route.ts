import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verify requester is master_access, federation admin/staff, or academia admin
    const { data: perfil } = await supabase
      .from('stakeholders')
      .select('role, academia_id')
      .eq('id', user.id)
      .single()

    const allowed = ['master_access', 'federacao_admin', 'federacao_staff', 'academia_admin', 'academia_staff']
    if (!perfil || !allowed.includes(perfil.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await req.json()

    // Whitelist all admin-editable fields
    const ALLOWED_FIELDS = [
      'nome_completo', 'nome_patch', 'genero', 'data_nascimento', 'nacionalidade',
      'email', 'telefone', 'cidade', 'estado', 'pais', 'tamanho_patch',
      'kyu_dan_id', 'nivel_arbitragem', 'academia_id', 'academias',
      'status_membro', 'data_adesao', 'plano_tipo', 'status_plano',
      'data_expiracao', 'lote_id', 'observacoes',
    ] as const

    const payload: Record<string, unknown> = {}
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        const v = body[key]
        payload[key] = v === '' ? null : v
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido enviado' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_fed_lrsj')
      .update(payload)
      .eq('stakeholder_id', id)
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
