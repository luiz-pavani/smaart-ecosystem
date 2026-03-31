import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET — list pending affiliation requests for the caller's federation
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('stakeholders')
    .select('role, master_access, federacao_id')
    .eq('id', user.id)
    .single()

  const allowed = ['master_access', 'federacao_admin', 'federacao_gestor', 'federacao_staff', 'admin']
  if (!me || (!me.master_access && !allowed.includes(me.role))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const federacaoId = req.nextUrl.searchParams.get('federacao_id') || me.federacao_id
  if (!federacaoId) return NextResponse.json({ pedidos: [] })

  const { data: pedidos } = await supabaseAdmin
    .from('filiacao_pedidos')
    .select(`
      id, status, created_at, observacao,
      stakeholder:stakeholder_id (id, nome_completo, email, telefone, kyu_dan_id),
      academia:academia_id (id, nome, endereco_cidade, endereco_estado)
    `)
    .eq('federacao_id', federacaoId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ pedidos: pedidos || [] })
}

// PATCH — approve or reject a request
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('stakeholders')
    .select('role, master_access, nome_completo')
    .eq('id', user.id)
    .single()

  const allowed = ['master_access', 'federacao_admin', 'federacao_gestor', 'admin']
  if (!me || (!me.master_access && !allowed.includes(me.role))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { pedido_id, status, observacao } = await req.json()
  if (!pedido_id || !['APROVADO', 'REJEITADO'].includes(status)) {
    return NextResponse.json({ error: 'pedido_id e status (APROVADO|REJEITADO) obrigatórios' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('filiacao_pedidos')
    .update({
      status,
      observacao: observacao || null,
      revisado_por: user.id,
      revisado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedido_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
