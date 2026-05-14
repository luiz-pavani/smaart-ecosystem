import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ALLOWED_FIELDS = [
  'nome_completo', 'email', 'telefone', 'data_nascimento', 'genero',
  'kyu_dan_id', 'federacao_id', 'academia_id', 'instagram', 'peso_atual',
]

const CAMPOS_CRITICOS = new Set(['nome_completo', 'kyu_dan_id', 'federacao_id'])

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerSt } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
  if (!callerSt || !['master_access', 'federacao_admin', 'admin'].includes(callerSt.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const stakeholder_id = url.searchParams.get('stakeholder_id')
  if (!stakeholder_id) return NextResponse.json({ error: 'stakeholder_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, email, telefone, data_nascimento, genero, kyu_dan_id, federacao_id, academia_id, instagram, peso_atual')
    .eq('id', stakeholder_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stakeholder: data })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerSt } = await supabaseAdmin.from('stakeholders').select('role').eq('id', user.id).single()
  if (!callerSt || !['master_access', 'federacao_admin', 'admin'].includes(callerSt.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { stakeholder_id, ...fields } = body

  if (!stakeholder_id) return NextResponse.json({ error: 'stakeholder_id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const k of Object.keys(fields)) {
    if (ALLOWED_FIELDS.includes(k)) updates[k] = fields[k]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('stakeholders')
    .update(updates)
    .eq('id', stakeholder_id)
    .select('id, nome_completo, email, telefone, data_nascimento, genero, kyu_dan_id, federacao_id, academia_id, instagram, peso_atual')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Editar como admin invalida verificação dos campos críticos alterados
  const criticosAlterados = Object.keys(updates).filter(k => CAMPOS_CRITICOS.has(k))
  if (criticosAlterados.length) {
    await supabaseAdmin
      .from('stakeholder_campo_verificado')
      .update({ verified: false, verified_at: null, verified_by: null })
      .eq('stakeholder_id', stakeholder_id)
      .in('campo', criticosAlterados)
  }

  return NextResponse.json({ stakeholder: data })
}
