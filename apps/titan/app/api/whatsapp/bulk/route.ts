import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendTemplate } from '@/lib/whatsapp/meta'

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') ? digits : `55${digits}`
}

// Resolve variables for each template based on athlete data
function buildVariables(
  template: string,
  atleta: { nome_completo: string; data_expiracao: string | null },
  hoje: Date,
): string[] {
  if (template === 'lrsj_atleta_boas_vindas') {
    return [atleta.nome_completo, 'LRSJ']
  }
  if (template === 'lrsj_atleta_plano_vencendo' && atleta.data_expiracao) {
    const venc = new Date(atleta.data_expiracao + 'T12:00:00')
    const dias = Math.max(1, Math.ceil((venc.getTime() - hoje.getTime()) / 86400000))
    return [atleta.nome_completo, String(dias), venc.toLocaleDateString('pt-BR')]
  }
  if (template === 'lrsj_atleta_plano_vencido') {
    return [atleta.nome_completo]
  }
  // Generic fallback — just send the name as first variable
  return [atleta.nome_completo]
}

// POST — bulk WhatsApp template send to a group of athletes
// Body: { group: 'plano_vencendo' | 'plano_vencido' | 'todos', template: string }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve academia_id from stakeholders
  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id, role')
    .eq('id', user.id)
    .maybeSingle()

  const academiaId = perfil?.academia_id
  if (!academiaId) return NextResponse.json({ error: 'Academia não identificada' }, { status: 403 })

  const body = await req.json()
  const { group, template } = body as { group: string; template: string }

  if (!group || !template) {
    return NextResponse.json({ error: 'group e template são obrigatórios' }, { status: 400 })
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const em30dias = new Date(hoje)
  em30dias.setDate(hoje.getDate() + 30)

  // Base query — all athletes of this academia with a phone
  let query = supabaseAdmin
    .from('user_fed_lrsj')
    .select('nome_completo, telefone, celular, data_expiracao')
    .eq('academia_id', academiaId)
    .eq('federacao_id', 1)

  if (group === 'plano_vencendo') {
    query = query
      .eq('status_plano', 'Válido')
      .not('data_expiracao', 'is', null)
      .gte('data_expiracao', hoje.toISOString().split('T')[0])
      .lte('data_expiracao', em30dias.toISOString().split('T')[0])
  } else if (group === 'plano_vencido') {
    query = query.eq('status_plano', 'Vencido')
  }
  // 'todos': no additional status filter

  const { data: atletas, error: dbErr } = await query
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  let sent = 0
  let skipped = 0
  let errors = 0

  for (const atleta of atletas ?? []) {
    const phone = normalizePhone(atleta.telefone || atleta.celular)
    if (!phone) { skipped++; continue }

    try {
      const variables = buildVariables(template, atleta, hoje)
      await sendTemplate(phone, template, variables)
      sent++
    } catch {
      errors++
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    errors,
    total: (atletas ?? []).length,
  })
}

// GET — preview: count how many athletes would receive (no send)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id')
    .eq('id', user.id)
    .maybeSingle()

  const academiaId = perfil?.academia_id
  if (!academiaId) return NextResponse.json({ error: 'Academia não identificada' }, { status: 403 })

  const group = req.nextUrl.searchParams.get('group') || 'todos'

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const em30dias = new Date(hoje)
  em30dias.setDate(hoje.getDate() + 30)

  let query = supabaseAdmin
    .from('user_fed_lrsj')
    .select('id, telefone, celular', { count: 'exact', head: false })
    .eq('academia_id', academiaId)
    .eq('federacao_id', 1)

  if (group === 'plano_vencendo') {
    query = query
      .eq('status_plano', 'Válido')
      .not('data_expiracao', 'is', null)
      .gte('data_expiracao', hoje.toISOString().split('T')[0])
      .lte('data_expiracao', em30dias.toISOString().split('T')[0])
  } else if (group === 'plano_vencido') {
    query = query.eq('status_plano', 'Vencido')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const comTelefone = (data ?? []).filter((a: any) => a.telefone || a.celular).length
  return NextResponse.json({ total: (data ?? []).length, com_telefone: comTelefone })
}
