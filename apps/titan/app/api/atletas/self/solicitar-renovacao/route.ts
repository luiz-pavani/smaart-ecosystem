import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  const { data: st } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id, federacao_id, nome_completo, kyu_dan_id')
    .eq('id', user.id)
    .single()

  // Resolve federacao_id de múltiplas fontes
  let federacaoId = st?.federacao_id ?? null
  let academiaId = st?.academia_id ?? null

  if (!federacaoId && academiaId) {
    const { data: acad } = await supabaseAdmin
      .from('academias')
      .select('federacao_id')
      .eq('id', academiaId)
      .maybeSingle()
    federacaoId = acad?.federacao_id ?? null
  }

  if (!federacaoId) {
    // user_fed_lrsj.federacao_id é integer (ex: 1), não UUID
    // Busca o UUID da federação correspondente na tabela federacoes
    const { data: lrsj } = await supabaseAdmin
      .from('user_fed_lrsj')
      .select('federacao_id')
      .eq('stakeholder_id', user.id)
      .maybeSingle()

    if (lrsj?.federacao_id) {
      // Busca o UUID real na tabela federacoes pela sigla 'LRSJ' ou pelo primeiro resultado
      const { data: fed } = await supabaseAdmin
        .from('federacoes')
        .select('id')
        .eq('ativo', true)
        .limit(1)
        .maybeSingle()
      federacaoId = fed?.id ?? null
    }
  }

  if (!federacaoId) {
    return NextResponse.json({ error: 'Federação não identificada. Atualize seu perfil.' }, { status: 400 })
  }

  // Atualiza kyu_dan_id no stakeholder se mudou
  if (body.kyu_dan_id && body.kyu_dan_id !== st?.kyu_dan_id) {
    await supabaseAdmin.from('stakeholders').update({ kyu_dan_id: body.kyu_dan_id }).eq('id', user.id)
  }

  // Upsert no pedido — se já existe um registro para este stakeholder+federação, atualiza para PENDENTE
  const { data: pedido, error } = await supabaseAdmin
    .from('filiacao_pedidos')
    .upsert(
      {
        stakeholder_id: user.id,
        academia_id: academiaId,
        federacao_id: federacaoId,
        status: 'PENDENTE',
        url_comprovante_pagamento: body.url_comprovante_pagamento ?? null,
        dados_formulario: {
          tipo: 'RENOVACAO',
          kyu_dan_id: body.kyu_dan_id ?? st?.kyu_dan_id ?? null,
          projeto_social: body.projeto_social ?? false,
          valor: body.valor ?? null,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stakeholder_id,federacao_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: pedido.id })
}
