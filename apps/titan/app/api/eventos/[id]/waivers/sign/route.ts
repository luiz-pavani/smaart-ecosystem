import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Calcula se uma data de nascimento (YYYY-MM-DD ou similar) corresponde a alguém
 * com menos de `maxAge` anos hoje. Conta anos completos (não fracionários).
 */
function isUnderAge(dataNascimento: string, maxAge: number): boolean {
  const dn = new Date(dataNascimento)
  if (isNaN(dn.getTime())) return false
  const hoje = new Date()
  let idade = hoje.getFullYear() - dn.getFullYear()
  const aniversarioJaPassouEsteAno =
    hoje.getMonth() > dn.getMonth() ||
    (hoje.getMonth() === dn.getMonth() && hoje.getDate() >= dn.getDate())
  if (!aniversarioJaPassouEsteAno) idade--
  return idade < maxAge
}

// POST /api/eventos/[id]/waivers/sign — atleta assina termos
// body: { registration_id, waiver_ids: string[],
//         signed_by_guardian?, guardian_name?, guardian_cpf?, guardian_relationship? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const {
    registration_id,
    waiver_ids,
    // Campos opcionais para atleta menor de idade. Frontend deve coletar
    // se idade do atleta < 18 (lei brasileira: CC art. 5, ECA).
    signed_by_guardian = false,
    guardian_name,
    guardian_cpf,
    guardian_relationship,
  } = await req.json()
  if (!registration_id || !waiver_ids?.length) {
    return NextResponse.json({ error: 'registration_id e waiver_ids obrigatórios' }, { status: 400 })
  }

  // Verify registration belongs to user (carrega data_nascimento pra validar maioridade)
  const { data: reg } = await supabaseAdmin
    .from('event_registrations')
    .select('id, atleta_id, dados_atleta')
    .eq('id', registration_id)
    .eq('event_id', eventoId)
    .maybeSingle()

  if (!reg) return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
  if (reg.atleta_id !== user.id) return NextResponse.json({ error: 'Inscrição não pertence a você' }, { status: 403 })

  // Determina se o atleta é menor de idade
  const dataNasc: string | null = (reg.dados_atleta as any)?.data_nascimento ?? null
  const isMenor = dataNasc ? isUnderAge(dataNasc, 18) : false

  if (isMenor) {
    if (!signed_by_guardian) {
      return NextResponse.json({
        error: 'Atleta menor de idade — termos precisam ser assinados pelo responsável legal.',
      }, { status: 400 })
    }
    if (!guardian_name?.trim() || !guardian_cpf?.trim() || !guardian_relationship?.trim()) {
      return NextResponse.json({
        error: 'Dados do responsável legal incompletos (nome, CPF e parentesco obrigatórios).',
      }, { status: 400 })
    }
  }

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const ua = req.headers.get('user-agent') || ''

  const rows = waiver_ids.map((wid: string) => ({
    waiver_id: wid,
    registration_id,
    atleta_id: user.id,
    ip_address: ip,
    user_agent: ua,
    signed_by_guardian: isMenor ? true : !!signed_by_guardian,
    guardian_name: isMenor ? guardian_name?.trim() : null,
    guardian_cpf: isMenor ? guardian_cpf?.trim() : null,
    guardian_relationship: isMenor ? guardian_relationship?.trim() : null,
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
      .update({ status: 'confirmed' })
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
