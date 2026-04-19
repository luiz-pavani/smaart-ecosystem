import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// POST /api/eventos/[id]/waivers/sign — atleta assina termos
// body: { registration_id, waiver_ids: string[] }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { registration_id, waiver_ids } = await req.json()
  if (!registration_id || !waiver_ids?.length) {
    return NextResponse.json({ error: 'registration_id e waiver_ids obrigatórios' }, { status: 400 })
  }

  // Verify registration belongs to user
  const { data: reg } = await supabaseAdmin
    .from('event_registrations')
    .select('id, atleta_id')
    .eq('id', registration_id)
    .eq('event_id', eventoId)
    .maybeSingle()

  if (!reg) return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
  if (reg.atleta_id !== user.id) return NextResponse.json({ error: 'Inscrição não pertence a você' }, { status: 403 })

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const ua = req.headers.get('user-agent') || ''

  const rows = waiver_ids.map((wid: string) => ({
    waiver_id: wid,
    registration_id,
    atleta_id: user.id,
    ip_address: ip,
    user_agent: ua,
  }))

  const { error } = await supabaseAdmin
    .from('event_waiver_signatures')
    .upsert(rows, { onConflict: 'waiver_id,registration_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Check if all mandatory waivers are now signed — upgrade status from pending_waivers
  const { data: allWaivers } = await supabaseAdmin
    .from('event_waivers')
    .select('id')
    .eq('evento_id', eventoId)
    .eq('ativo', true)
    .eq('obrigatorio', true)

  const { data: allSigs } = await supabaseAdmin
    .from('event_waiver_signatures')
    .select('waiver_id')
    .eq('registration_id', registration_id)

  const signedSet = new Set((allSigs || []).map(s => s.waiver_id))
  const allSigned = (allWaivers || []).every(w => signedSet.has(w.id))

  if (allSigned) {
    // Upgrade status if currently pending_waivers
    await supabaseAdmin
      .from('event_registrations')
      .update({ status: 'confirmado' })
      .eq('id', registration_id)
      .eq('status', 'pending_waivers')
  }

  return NextResponse.json({ ok: true, signed: waiver_ids.length, all_signed: allSigned })
}

// GET /api/eventos/[id]/waivers/sign?registration_id=xxx — verificar assinaturas
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const registrationId = req.nextUrl.searchParams.get('registration_id')
  if (!registrationId) return NextResponse.json({ error: 'registration_id obrigatório' }, { status: 400 })

  // Get all waivers for this event
  const { data: waivers } = await supabaseAdmin
    .from('event_waivers')
    .select('id, titulo, obrigatorio')
    .eq('evento_id', eventoId)
    .eq('ativo', true)

  // Get existing signatures
  const { data: signatures } = await supabaseAdmin
    .from('event_waiver_signatures')
    .select('waiver_id, assinado_em')
    .eq('registration_id', registrationId)

  const signedIds = new Set((signatures || []).map(s => s.waiver_id))

  const status = (waivers || []).map(w => ({
    waiver_id: w.id,
    titulo: w.titulo,
    obrigatorio: w.obrigatorio,
    assinado: signedIds.has(w.id),
  }))

  const pendentes = status.filter(s => s.obrigatorio && !s.assinado).length

  return NextResponse.json({ waivers: status, pendentes })
}
