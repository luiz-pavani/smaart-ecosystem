import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function resolveAcademiaIdServer(userId: string): Promise<string | null> {
  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id')
    .eq('id', userId)
    .maybeSingle()
  return perfil?.academia_id ?? null
}

// GET — list athletes in this academia with their filiation status
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const academiaId = req.nextUrl.searchParams.get('academia_id') || await resolveAcademiaIdServer(user.id)
  if (!academiaId) return NextResponse.json({ error: 'Academia não vinculada' }, { status: 400 })

  // Primary: get all user_fed_lrsj entries for this academia
  const { data: lrsjRows } = await supabaseAdmin
    .from('user_fed_lrsj')
    .select('stakeholder_id, nome_completo, status_plano, data_expiracao, kyu_dan_id, kyu_dan:kyu_dan_id(id, cor_faixa, kyu_dan)')
    .eq('academia_id', academiaId)
    .eq('federacao_id', 1)
    .order('nome_completo')

  if (!lrsjRows?.length) return NextResponse.json({ atletas: [] })

  const stkIds = lrsjRows.map(r => r.stakeholder_id).filter(Boolean) as string[]

  // Enrich with stakeholder data (email, telefone, data_nascimento)
  const { data: stks } = stkIds.length ? await supabaseAdmin
    .from('stakeholders')
    .select('id, email, telefone, data_nascimento')
    .in('id', stkIds) : { data: [] }

  const stkMap = Object.fromEntries((stks || []).map(s => [s.id, s]))

  // Pending filiation requests
  const { data: pedidos } = stkIds.length ? await supabaseAdmin
    .from('filiacao_pedidos')
    .select('stakeholder_id, status, created_at')
    .in('stakeholder_id', stkIds)
    .eq('status', 'PENDENTE')
    .order('created_at', { ascending: false }) : { data: [] }

  const pedidoMap: Record<string, boolean> = {}
  for (const p of pedidos || []) {
    if (!pedidoMap[p.stakeholder_id]) pedidoMap[p.stakeholder_id] = true
  }

  const today = new Date()

  const atletas = lrsjRows.map((r: any) => {
    const stk = stkMap[r.stakeholder_id] ?? {}
    const kd = Array.isArray(r.kyu_dan) ? r.kyu_dan[0] : r.kyu_dan
    const hasPendente = pedidoMap[r.stakeholder_id] ?? false

    let situacao: 'sem_filiacao' | 'valido' | 'vencido' | 'vencendo' | 'pendente'
    if (hasPendente) {
      situacao = 'pendente'
    } else if (!r.status_plano) {
      situacao = 'sem_filiacao'
    } else if (r.status_plano === 'Válido') {
      const exp = new Date(r.data_expiracao)
      const dias = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      situacao = dias <= 60 ? 'vencendo' : 'valido'
    } else {
      situacao = 'vencido'
    }

    return {
      id: r.stakeholder_id,
      nome_completo: r.nome_completo,
      email: stk.email ?? null,
      telefone: stk.telefone ?? null,
      kyu_dan_id: r.kyu_dan_id,
      kyu_dan: kd ?? null,
      data_nascimento: stk.data_nascimento ?? null,
      situacao,
      data_expiracao: r.data_expiracao ?? null,
    }
  })

  return NextResponse.json({ atletas })
}

// POST — create bulk filiation/renovation requests
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { atletas, url_comprovante_pagamento, tipo } = body

  // Accept academia_id from body (master_access) or resolve from stakeholder
  const academiaId = body.academia_id || await resolveAcademiaIdServer(user.id)
  if (!academiaId) return NextResponse.json({ error: 'Academia não vinculada' }, { status: 400 })

  // Resolve federacao_id from academia
  const { data: acad } = await supabaseAdmin
    .from('academias')
    .select('federacao_id')
    .eq('id', academiaId)
    .maybeSingle()
  const federacaoId = acad?.federacao_id ?? null

  if (!federacaoId) return NextResponse.json({ error: 'Federação não identificada' }, { status: 400 })

  if (!atletas?.length) return NextResponse.json({ error: 'Nenhum atleta selecionado' }, { status: 400 })

  const rows = atletas.map((a: any) => ({
    stakeholder_id: a.id,
    academia_id: academiaId,
    federacao_id: federacaoId,
    status: 'PENDENTE',
    url_comprovante_pagamento: url_comprovante_pagamento ?? null,
    dados_formulario: {
      tipo: tipo || 'RENOVACAO',
      kyu_dan_id: a.kyu_dan_id ?? null,
      projeto_social: a.projeto_social ?? false,
      valor: a.valor ?? null,
      submetido_por_academia: true,
    },
  }))

  const { data: inserted, error } = await supabaseAdmin
    .from('filiacao_pedidos')
    .insert(rows)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, total: rows.length, ids: (inserted || []).map((r: any) => r.id) })
}
