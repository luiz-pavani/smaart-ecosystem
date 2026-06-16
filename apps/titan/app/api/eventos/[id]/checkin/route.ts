import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

async function requireAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return ADMIN_ROLES.includes(data?.role ?? '')
}

/**
 * GET /api/eventos/[id]/checkin
 * Lista inscrições do evento com status de credenciamento.
 * Query: ?status=checked_in|pending|all (default all)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await requireAdmin(user.id))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const status = req.nextUrl.searchParams.get('status') || 'all'

  let q = supabaseAdmin
    .from('event_registrations')
    .select(`
      id, atleta_id, category_id, status, checked_in, checked_in_at, checkin_token,
      dados_atleta, peso_inscricao, academia_id,
      atletas:atleta_id (id, nome, sobrenome),
      categories:category_id (id, nome, peso_min, peso_max, genero, faixa_etaria)
    `)
    .eq('event_id', eventoId)
    .in('status', ['pago', 'confirmado', 'aprovado'])
    .order('created_at', { ascending: true })

  if (status === 'checked_in') q = q.eq('checked_in', true)
  if (status === 'pending') q = q.eq('checked_in', false)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = data?.length || 0
  const checkedIn = data?.filter(r => r.checked_in).length || 0

  return NextResponse.json({
    inscricoes: data || [],
    summary: { total, checked_in: checkedIn, pendente: total - checkedIn },
  })
}

/**
 * POST /api/eventos/[id]/checkin
 * Body: { token?: string, registration_id?: string, revert?: boolean }
 * Marca/desmarca check-in. Aceita token (do QR) OU registration_id (do click).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await requireAdmin(user.id))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const token = typeof body.token === 'string' ? body.token.trim() : null
  const registrationId = typeof body.registration_id === 'string' ? body.registration_id : null
  const revert = !!body.revert

  if (!token && !registrationId) {
    return NextResponse.json({ error: 'token ou registration_id obrigatório' }, { status: 400 })
  }

  let q = supabaseAdmin
    .from('event_registrations')
    .select('id, event_id, status, checked_in, atleta_id, dados_atleta')
    .eq('event_id', eventoId)
    .limit(1)
  if (token) q = q.eq('checkin_token', token)
  if (registrationId) q = q.eq('id', registrationId)

  const { data: reg, error: regErr } = await q.maybeSingle()
  if (regErr) return NextResponse.json({ error: regErr.message }, { status: 500 })
  if (!reg) return NextResponse.json({ error: 'Inscrição não encontrada neste evento' }, { status: 404 })

  if (!['pago', 'confirmado', 'aprovado'].includes(reg.status)) {
    return NextResponse.json({
      error: `Inscrição com status "${reg.status}" não pode ser credenciada (pagamento pendente?)`,
    }, { status: 400 })
  }

  const newCheckedIn = revert ? false : true

  const { error: updErr } = await supabaseAdmin
    .from('event_registrations')
    .update({
      checked_in: newCheckedIn,
      checked_in_at: newCheckedIn ? new Date().toISOString() : null,
      checked_in_by: newCheckedIn ? user.id : null,
    })
    .eq('id', reg.id)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    registration_id: reg.id,
    checked_in: newCheckedIn,
    was_already: reg.checked_in === newCheckedIn,
  })
}
