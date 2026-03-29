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

  const { inscricao_id, status_inscricao, status_pagamento, observacoes } = await req.json()
  if (!inscricao_id) return NextResponse.json({ error: 'inscricao_id required' }, { status: 400 })

  const updates: Record<string, any> = {}
  if (status_inscricao !== undefined) updates.status_inscricao = status_inscricao
  if (status_pagamento !== undefined) updates.status_pagamento = status_pagamento
  if (observacoes !== undefined) updates.observacoes = observacoes

  const { data, error } = await supabaseAdmin
    .from('candidato_inscricoes')
    .update(updates)
    .eq('id', inscricao_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inscricao: data })
}
