import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

async function getRole(userId: string) {
  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role ?? null
}

/**
 * POST /api/eventos/[id]/brackets/[bracketId]/swap-slots
 * Body: { slot_a_id: string, slot_b_id: string }
 *
 * Troca os registration_id de 2 slots da rodada 1 + atualiza os matches
 * subsequentes correspondentes.
 *
 * Só permite swap em bracket com status='draft' — quando começa o evento
 * (status='active' ou 'finished'), os resultados já podem ter avançado
 * e mexer no seed seria destrutivo.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bracketId: string }> }
) {
  const { bracketId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { slot_a_id, slot_b_id } = await req.json()
  if (!slot_a_id || !slot_b_id || slot_a_id === slot_b_id) {
    return NextResponse.json({ error: 'slot_a_id e slot_b_id distintos obrigatórios' }, { status: 400 })
  }

  // Garante bracket draft
  const { data: bracket } = await supabaseAdmin
    .from('event_brackets')
    .select('id, status')
    .eq('id', bracketId)
    .maybeSingle()
  if (!bracket) return NextResponse.json({ error: 'Chave não encontrada' }, { status: 404 })
  if (bracket.status !== 'draft') {
    return NextResponse.json({
      error: 'Só é possível trocar atletas em chaves no rascunho (status=draft).',
    }, { status: 409 })
  }

  // Busca os 2 slots
  const { data: slots } = await supabaseAdmin
    .from('event_bracket_slots')
    .select('id, bracket_id, rodada, posicao, registration_id, is_bye')
    .in('id', [slot_a_id, slot_b_id])

  if (!slots || slots.length !== 2) {
    return NextResponse.json({ error: 'Slots não encontrados' }, { status: 404 })
  }
  if (slots.some(s => s.bracket_id !== bracketId)) {
    return NextResponse.json({ error: 'Slot não pertence a esta chave' }, { status: 400 })
  }
  if (slots.some(s => s.rodada !== 1)) {
    return NextResponse.json({ error: 'Só é possível trocar slots da rodada 1' }, { status: 400 })
  }

  const a = slots.find(s => s.id === slot_a_id)!
  const b = slots.find(s => s.id === slot_b_id)!

  // Troca registration_id nos slots
  await supabaseAdmin
    .from('event_bracket_slots')
    .update({ registration_id: b.registration_id, is_bye: b.is_bye })
    .eq('id', a.id)
  await supabaseAdmin
    .from('event_bracket_slots')
    .update({ registration_id: a.registration_id, is_bye: a.is_bye })
    .eq('id', b.id)

  // Atualiza matches da rodada 1 com os mesmos posicao/slot.
  // event_matches.rodada=1, posicao=floor(slot.posicao/2)
  // athlete1 vai pra slot.posicao par; athlete2 pra ímpar.
  const matchPosA = Math.floor(a.posicao / 2)
  const matchPosB = Math.floor(b.posicao / 2)
  const aSlotEven = a.posicao % 2 === 0
  const bSlotEven = b.posicao % 2 === 0

  const { data: matchA } = await supabaseAdmin
    .from('event_matches')
    .select('id, athlete1_registration_id, athlete2_registration_id')
    .eq('bracket_id', bracketId)
    .eq('rodada', 1)
    .eq('posicao', matchPosA)
    .maybeSingle()

  const { data: matchB } = matchPosA === matchPosB
    ? { data: matchA }
    : await supabaseAdmin
        .from('event_matches')
        .select('id, athlete1_registration_id, athlete2_registration_id')
        .eq('bracket_id', bracketId)
        .eq('rodada', 1)
        .eq('posicao', matchPosB)
        .maybeSingle()

  if (matchA) {
    const updates: Record<string, unknown> = {}
    updates[aSlotEven ? 'athlete1_registration_id' : 'athlete2_registration_id'] = b.registration_id
    if (matchPosA === matchPosB) {
      // Swap dentro do mesmo match: ambos campos atualizam
      updates[bSlotEven ? 'athlete1_registration_id' : 'athlete2_registration_id'] = a.registration_id
    }
    await supabaseAdmin.from('event_matches').update(updates).eq('id', matchA.id)
  }
  if (matchB && matchPosA !== matchPosB) {
    const updates: Record<string, unknown> = {}
    updates[bSlotEven ? 'athlete1_registration_id' : 'athlete2_registration_id'] = a.registration_id
    await supabaseAdmin.from('event_matches').update(updates).eq('id', matchB.id)
  }

  return NextResponse.json({ ok: true })
}
