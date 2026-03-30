import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: st } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
  if (!st || !['master_access','federacao_admin','admin'].includes(st.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { inscricao_id, stakeholder_id, status_inscricao, status_pagamento, observacoes, graduacao_pretendida } = await req.json()

  // CREATE — admin confirming inscription on behalf of candidate
  if (!inscricao_id) {
    if (!stakeholder_id) return NextResponse.json({ error: 'stakeholder_id required to create' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('candidato_inscricoes')
      .insert({
        stakeholder_id,
        graduacao_pretendida: graduacao_pretendida || 'Shodan (1º Dan)',
        status_inscricao: status_inscricao || 'CONFIRMADO',
        status_pagamento: status_pagamento || 'PENDENTE',
        observacoes: observacoes || null,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ inscricao: data })
  }

  // UPDATE — existing inscription
  const updates: Record<string, any> = {}
  if (status_inscricao !== undefined) updates.status_inscricao = status_inscricao
  if (status_pagamento !== undefined) updates.status_pagamento = status_pagamento
  if (observacoes !== undefined) updates.observacoes = observacoes
  if (graduacao_pretendida !== undefined) updates.graduacao_pretendida = graduacao_pretendida

  const { data, error } = await supabaseAdmin
    .from('candidato_inscricoes')
    .update(updates)
    .eq('id', inscricao_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inscricao: data })
}
