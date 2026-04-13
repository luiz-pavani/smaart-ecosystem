import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { DEFAULT_BRACKET_RULES, BracketRule } from '@/lib/eventos/bracket-generator'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

// GET /api/eventos/[id]/bracket-rules — get bracket rules for event
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('config')
    .eq('id', eventoId)
    .maybeSingle()

  const config = (evento?.config as Record<string, unknown>) || {}
  const rules = (config.bracket_rules as BracketRule[]) || DEFAULT_BRACKET_RULES

  return NextResponse.json({ rules, defaults: DEFAULT_BRACKET_RULES })
}

// PUT /api/eventos/[id]/bracket-rules — save bracket rules
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: stk } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!stk || !ADMIN_ROLES.includes(stk.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { rules }: { rules: BracketRule[] } = await req.json()

  if (!Array.isArray(rules) || rules.length === 0) {
    return NextResponse.json({ error: 'rules deve ser um array não vazio' }, { status: 400 })
  }

  // Validate rules
  for (const r of rules) {
    if (typeof r.min !== 'number' || typeof r.max !== 'number' || !r.tipo) {
      return NextResponse.json({ error: 'Cada regra precisa de min, max e tipo' }, { status: 400 })
    }
  }

  // Get current config and merge
  const { data: evento } = await supabaseAdmin
    .from('eventos')
    .select('config')
    .eq('id', eventoId)
    .maybeSingle()

  const config = (evento?.config as Record<string, unknown>) || {}
  config.bracket_rules = rules

  const { error } = await supabaseAdmin
    .from('eventos')
    .update({ config })
    .eq('id', eventoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, rules })
}
