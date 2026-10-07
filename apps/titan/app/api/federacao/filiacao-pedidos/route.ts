import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { preencherStakeholderVazio, upsertFiliacoesLrsj } from '@/lib/filiacao/lrsj'

// GET — list pending affiliation requests for the caller's federation
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('stakeholders')
    .select('role, federacao_id')
    .eq('id', user.id)
    .single()

  const allowed = ['master_access', 'federacao_admin', 'federacao_gestor', 'federacao_staff', 'admin']
  if (!me || !allowed.includes(me.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const federacaoId = req.nextUrl.searchParams.get('federacao_id') || me.federacao_id

  let query = supabaseAdmin
    .from('filiacao_pedidos')
    .select(`
      id, status, created_at, observacao,
      url_documento_id, url_comprovante_pagamento, dados_formulario,
      stakeholder:stakeholder_id (id, nome_completo, email, telefone, kyu_dan_id, genero, data_nascimento),
      academia:academia_id (id, nome, endereco_cidade, endereco_estado)
    `)
    .order('created_at', { ascending: false })

  const isMaster = me.role === 'master_access'

  // Non-master users must be scoped to their federation
  if (!isMaster) {
    if (!federacaoId) return NextResponse.json({ pedidos: [] })
    query = query.eq('federacao_id', federacaoId)
  } else if (federacaoId) {
    query = query.eq('federacao_id', federacaoId)
  }

  const { data: pedidos } = await query

  // Enrich pedidos with payment info from pagamentos table
  const pedidoIds = (pedidos || []).map((p: any) => p.id)
  let pagamentosMap: Record<string, any> = {}

  if (pedidoIds.length > 0) {
    const { data: pagamentos } = await supabaseAdmin
      .from('pagamentos')
      .select('referencia_id, safe2pay_id, tipo, valor, status, created_at, updated_at, metadata')
      .in('referencia_tipo', ['filiacao_pedido', 'filiacao_atleta'])
      .in('referencia_id', pedidoIds)
      .order('created_at', { ascending: false })

    if (pagamentos) {
      for (const pg of pagamentos) {
        // Keep only the most recent payment per pedido
        if (!pagamentosMap[pg.referencia_id]) {
          pagamentosMap[pg.referencia_id] = pg
        }
      }
    }
  }

  const enriched = (pedidos || []).map((p: any) => ({
    ...p,
    pagamento: pagamentosMap[p.id] || null,
  }))

  return NextResponse.json({ pedidos: enriched })
}

// PATCH — approve or reject a request
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('stakeholders')
    .select('role, nome_completo')
    .eq('id', user.id)
    .single()

  const allowed = ['master_access', 'federacao_admin', 'federacao_gestor', 'admin']
  if (!me || !allowed.includes(me.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { pedido_id, status, observacao, data_expiracao_override } = await req.json()
  if (!pedido_id || !['APROVADO', 'REJEITADO', 'PENDENTE'].includes(status)) {
    return NextResponse.json({ error: 'pedido_id e status (APROVADO|REJEITADO|PENDENTE) obrigatórios' }, { status: 400 })
  }

  // Fetch the pedido to get stakeholder/academia/federacao and dados_formulario
  const { data: pedido } = await supabaseAdmin
    .from('filiacao_pedidos')
    .select('stakeholder_id, academia_id, federacao_id, dados_formulario, url_documento_id, created_at')
    .eq('id', pedido_id)
    .single()

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

  // On approval: sync data to stakeholder_filiacoes and stakeholders
  if (status === 'APROVADO' && pedido) {
    const df = (pedido.dados_formulario || {}) as Record<string, unknown>

    // Fetch stakeholder for base data
    const { data: st } = await supabaseAdmin
      .from('stakeholders')
      .select('kyu_dan_id')
      .eq('id', pedido.stakeholder_id)
      .single()

    const hoje = new Date().toISOString().split('T')[0]
    // data_expiracao: override manual ou 365 dias a partir da data de criação do pedido
    let dataExpiracao: string
    if (data_expiracao_override) {
      dataExpiracao = data_expiracao_override
    } else {
      const base = new Date(pedido.created_at ?? Date.now())
      base.setFullYear(base.getFullYear() + 1)
      dataExpiracao = base.toISOString().split('T')[0]
    }

    const kyuDanId = (df.kyu_dan_id as number | undefined) ?? st?.kyu_dan_id ?? null

    // cor_patch must be uppercase per DB check constraint
    const corPatch = (df.cor_patch as string | undefined)?.toUpperCase() ?? null

    // user_fed_lrsj é VIEW sem INSERT — filiação vai direto em stakeholder_filiacoes.
    const { error: upsertError } = await upsertFiliacoesLrsj(supabaseAdmin, [{
      stakeholder_id: pedido.stakeholder_id,
      academia_id: pedido.academia_id,
      nome_patch: (df.nome_patch as string | undefined) ?? null,
      tamanho_patch: (df.tamanho_patch as string | undefined) ?? null,
      cor_patch: corPatch,
      kyu_dan_id: kyuDanId,
      status_membro: 'ativo',
      status_plano: 'Válido',
      data_adesao: hoje,
      data_expiracao: dataExpiracao,
      url_documento_id: pedido.url_documento_id ?? null,
      dados_validados: false,
    }])

    if (upsertError) {
      console.error('[filiacao-pedidos] Erro ao gravar filiação:', upsertError)
    }

    // Stakeholder: vínculo com a federação e graduação do pedido; dados pessoais do formulário
    // só preenchem o que está vazio.
    const stUpdate: Record<string, unknown> = { federacao_id: pedido.federacao_id }
    if (kyuDanId) stUpdate.kyu_dan_id = kyuDanId
    await supabaseAdmin.from('stakeholders').update(stUpdate).eq('id', pedido.stakeholder_id)
    const { error: stError } = await preencherStakeholderVazio(supabaseAdmin, pedido.stakeholder_id, {
      genero: (df.genero as string | undefined) ?? null,
      data_nascimento: (df.data_nascimento as string | undefined) ?? null,
      telefone: (df.telefone as string | undefined) ?? null,
    })
    if (stError) console.error('[filiacao-pedidos] Erro ao preencher stakeholder:', stError)
  }

  return NextResponse.json({ ok: true })
}
