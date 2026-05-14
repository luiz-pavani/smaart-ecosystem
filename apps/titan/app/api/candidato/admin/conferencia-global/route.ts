import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// POST — carimba/destrava a conferência global de dados do candidato
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerSt } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
  if (!callerSt || !['master_access', 'federacao_admin', 'admin'].includes(callerSt.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { inscricao_id, conferir } = await req.json()
  if (!inscricao_id) return NextResponse.json({ error: 'inscricao_id required' }, { status: 400 })

  const updates = conferir
    ? { dados_verificados_em: new Date().toISOString(), dados_verificados_por: user.id }
    : { dados_verificados_em: null, dados_verificados_por: null }

  const { data, error } = await supabaseAdmin
    .from('candidato_inscricoes')
    .update(updates)
    .eq('id', inscricao_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inscricao: data })
}
