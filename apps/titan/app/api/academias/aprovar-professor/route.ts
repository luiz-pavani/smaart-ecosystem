import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const APPROVER_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor', 'academia_admin']

/**
 * GET /api/academias/aprovar-professor
 * Lista professores pendentes que o usuário pode aprovar.
 * - academia_admin: vê pendentes da própria academia
 * - federacao_admin: vê pendentes de academias da federação + academias pendentes
 * - master_access: vê tudo
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('stakeholders')
    .select('role, academia_id, federacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!me || !APPROVER_ROLES.includes(me.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  let q = supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, email, telefone, cpf, academia_id, approval_status, approval_requested_at')
    .neq('approval_status', 'aprovado')
    .order('approval_requested_at', { ascending: true })

  if (me.role === 'academia_admin') {
    if (!me.academia_id) return NextResponse.json({ pendentes: [] })
    q = q.eq('academia_id', me.academia_id).eq('approval_status', 'pendente_academia')
  } else if (me.role === 'federacao_admin' || me.role === 'federacao_gestor') {
    // Pendentes da própria federação
    if (!me.federacao_id) return NextResponse.json({ pendentes: [] })
    const { data: acads } = await supabaseAdmin
      .from('academias')
      .select('id')
      .eq('federacao_id', me.federacao_id)
    const ids = (acads || []).map(a => a.id)
    if (ids.length === 0) return NextResponse.json({ pendentes: [] })
    q = q.in('academia_id', ids)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pendentes: data || [] })
}

/**
 * POST /api/academias/aprovar-professor
 * Body: { stakeholder_id, action: 'aprovar' | 'rejeitar' }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('stakeholders')
    .select('role, academia_id, federacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!me || !APPROVER_ROLES.includes(me.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const stakeholderId = String(body.stakeholder_id || '')
  const action = body.action === 'rejeitar' ? 'rejeitar' : 'aprovar'

  if (!stakeholderId) return NextResponse.json({ error: 'stakeholder_id obrigatório' }, { status: 400 })

  // Carrega o alvo
  const { data: alvo } = await supabaseAdmin
    .from('stakeholders')
    .select('id, academia_id, approval_status')
    .eq('id', stakeholderId)
    .maybeSingle()
  if (!alvo) return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 })

  // Permissão escopo
  if (me.role === 'academia_admin' && alvo.academia_id !== me.academia_id) {
    return NextResponse.json({ error: 'Fora do escopo da sua academia' }, { status: 403 })
  }

  const novoStatus = action === 'aprovar' ? 'aprovado' : 'rejeitado'

  const { error } = await supabaseAdmin
    .from('stakeholders')
    .update({
      approval_status: novoStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', stakeholderId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: novoStatus })
}
