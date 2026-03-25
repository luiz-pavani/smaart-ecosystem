import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const FED_ID = 1

async function requireFedAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('master_access, role')
    .eq('id', user.id)
    .maybeSingle()
  if (!data?.master_access && data?.role !== 'federacao') return null
  return user
}

// GET — returns current lote config
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('federacao_lote_config')
    .select('ano, sequencia, lote_atual')
    .eq('federacao_id', FED_ID)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ lote_atual: 'N2026 1', ano: 2026, sequencia: 1 })
  }
  return NextResponse.json(data)
}

// POST /api/federacao/lote — fechar lote atual, avançar sequência
export async function POST(req: NextRequest) {
  const user = await requireFedAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: current } = await supabaseAdmin
    .from('federacao_lote_config')
    .select('ano, sequencia')
    .eq('federacao_id', FED_ID)
    .maybeSingle()

  const novaSeq = (current?.sequencia ?? 0) + 1
  const ano = current?.ano ?? new Date().getFullYear()

  const { data, error } = await supabaseAdmin
    .from('federacao_lote_config')
    .upsert({ federacao_id: FED_ID, ano, sequencia: novaSeq, updated_at: new Date().toISOString() })
    .select('ano, sequencia, lote_atual')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, novo_lote: data.lote_atual, ...data })
}

// PATCH /api/federacao/lote — atualizar lote de um atleta individualmente
// Body: { atleta_id: string, lote_id: string }
export async function PATCH(req: NextRequest) {
  const user = await requireFedAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { atleta_id, lote_id } = await req.json()
  if (!atleta_id || !lote_id) {
    return NextResponse.json({ error: 'atleta_id e lote_id são obrigatórios' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('user_fed_lrsj')
    .update({ lote_id })
    .eq('stakeholder_id', atleta_id)
    .eq('federacao_id', FED_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
