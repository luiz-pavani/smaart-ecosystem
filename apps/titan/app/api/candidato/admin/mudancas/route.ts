import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const CAMPOS_CRITICOS = ['nome_completo', 'kyu_dan_id', 'federacao_id']

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const stakeholder_id = url.searchParams.get('stakeholder_id')
  const status = url.searchParams.get('status') || 'pendente'

  const { data: callerSt } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
  const isAdmin = callerSt && ['master_access', 'federacao_admin', 'admin'].includes(callerSt.role)

  if (stakeholder_id && stakeholder_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let query = supabaseAdmin
    .from('stakeholder_mudanca_pendente')
    .select('*')
    .eq('status', status)
    .order('solicitado_em', { ascending: false })

  if (stakeholder_id) {
    query = query.eq('stakeholder_id', stakeholder_id)
  } else if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ mudancas: data || [] })
}

// PATCH — decidir (aprovar/rejeitar) uma mudança pendente
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerSt } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
  if (!callerSt || !['master_access', 'federacao_admin', 'admin'].includes(callerSt.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, decisao, motivo_rejeicao } = await req.json()
  if (!id || !decisao) return NextResponse.json({ error: 'id and decisao required' }, { status: 400 })
  if (!['aprovado', 'rejeitado'].includes(decisao)) {
    return NextResponse.json({ error: 'decisao must be aprovado or rejeitado' }, { status: 400 })
  }

  const { data: mudanca, error: fetchErr } = await supabaseAdmin
    .from('stakeholder_mudanca_pendente')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchErr || !mudanca) return NextResponse.json({ error: 'Mudança não encontrada' }, { status: 404 })
  if (mudanca.status !== 'pendente') {
    return NextResponse.json({ error: 'Mudança já decidida' }, { status: 409 })
  }

  if (decisao === 'aprovado') {
    const valor = mudanca.campo === 'kyu_dan_id'
      ? (mudanca.valor_novo ? Number(mudanca.valor_novo) : null)
      : mudanca.valor_novo

    const { error: updErr } = await supabaseAdmin
      .from('stakeholders')
      .update({ [mudanca.campo]: valor })
      .eq('id', mudanca.stakeholder_id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  const { data, error } = await supabaseAdmin
    .from('stakeholder_mudanca_pendente')
    .update({
      status: decisao,
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
      motivo_rejeicao: decisao === 'rejeitado' ? (motivo_rejeicao || null) : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mudanca: data })
}

// POST — candidato solicita mudança em campo crítico
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campo, valor_novo } = await req.json()
  if (!campo || valor_novo === undefined) {
    return NextResponse.json({ error: 'campo and valor_novo required' }, { status: 400 })
  }
  if (!CAMPOS_CRITICOS.includes(campo)) {
    return NextResponse.json({ error: 'Campo não requer aprovação' }, { status: 400 })
  }

  const { data: current } = await supabaseAdmin
    .from('stakeholders')
    .select(campo)
    .eq('id', user.id)
    .single()

  const valorAntigo = current ? String((current as any)[campo] ?? '') : null

  const { data, error } = await supabaseAdmin
    .from('stakeholder_mudanca_pendente')
    .insert({
      stakeholder_id: user.id,
      campo,
      valor_antigo: valorAntigo,
      valor_novo: String(valor_novo),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Já existe uma mudança pendente para este campo' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ mudanca: data })
}
