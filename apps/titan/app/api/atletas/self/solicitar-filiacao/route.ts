import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  // Get stakeholder to find academia and federation
  const { data: st } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id, federacao_id, nome_completo')
    .eq('id', user.id)
    .single()

  if (!st?.academia_id) {
    return NextResponse.json({ error: 'Selecione uma academia antes de solicitar filiação.' }, { status: 400 })
  }

  // Resolve federacao_id from academy if not set on stakeholder
  let federacaoId = st.federacao_id
  if (!federacaoId) {
    const { data: acad } = await supabaseAdmin
      .from('academias')
      .select('federacao_id')
      .eq('id', st.academia_id)
      .maybeSingle()
    federacaoId = acad?.federacao_id ?? null
  }

  if (!federacaoId) {
    return NextResponse.json({ error: 'Não foi possível identificar a federação desta academia.' }, { status: 400 })
  }

  // Update stakeholder with filled fields
  const stUpdate: Record<string, unknown> = {}
  const stFields = ['nome_completo', 'telefone', 'genero', 'data_nascimento']
  for (const f of stFields) {
    if (body[f]) stUpdate[f] = body[f]
  }
  if (Object.keys(stUpdate).length > 0) {
    await supabaseAdmin.from('stakeholders').update(stUpdate).eq('id', user.id).then(() => {}, () => {})
  }

  // Collect extra fields for the request record (include genero/data_nascimento for the modal)
  const dadosForm: Record<string, unknown> = {}
  const extraFields = ['cpf', 'cidade', 'estado', 'pais', 'nacionalidade', 'genero', 'data_nascimento', 'nome_patch', 'tamanho_patch', 'cor_patch', 'kyu_dan_id', 'observacoes']
  for (const f of extraFields) {
    if (body[f] !== undefined && body[f] !== '') {
      dadosForm[f] = f === 'kyu_dan_id' ? Number(body[f]) : body[f]
    }
  }

  // Upsert filiacao_pedidos — file URLs come pre-uploaded from client
  const { error } = await supabaseAdmin
    .from('filiacao_pedidos')
    .upsert(
      {
        stakeholder_id: user.id,
        academia_id: st.academia_id,
        federacao_id: federacaoId,
        status: 'PENDENTE',
        url_documento_id: body.url_documento_id ?? null,
        url_comprovante_pagamento: body.url_comprovante_pagamento ?? null,
        dados_formulario: dadosForm,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stakeholder_id,federacao_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync federacao_id to stakeholder if not set
  if (!st.federacao_id) {
    await supabaseAdmin.from('stakeholders').update({ federacao_id: federacaoId }).eq('id', user.id).then(() => {}, () => {})
  }

  return NextResponse.json({ ok: true })
}
