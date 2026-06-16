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
 * POST /api/eventos/[id]/brackets/[bracketId]/matches/[matchId]/sign-off
 *
 * Sign-off de mesa: 2º admin confirma resultado depois que o árbitro central
 * registrou o winner. Funciona como double-check de compliance.
 *
 * Regras:
 *   - Match deve estar status='finished' e ter winner_registration_id.
 *   - signer (user.id) deve ser diferente de finished_by (não pode confirmar
 *     o próprio resultado). master_access pode bypass essa regra em caso de
 *     evento pequeno onde só 1 admin está presente.
 *   - confirmed_by null = pendente; depois confirmado, não pode ser
 *     desconfirmado (idempotente).
 *
 * DELETE: reabre o match (limpa confirmed_*). Só master_access.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: match } = await supabaseAdmin
    .from('event_matches')
    .select('id, status, winner_registration_id, finished_by, confirmed_by')
    .eq('id', matchId)
    .maybeSingle()

  if (!match) return NextResponse.json({ error: 'Luta não encontrada' }, { status: 404 })
  if (match.status !== 'finished' || !match.winner_registration_id) {
    return NextResponse.json({
      error: 'Luta ainda não foi finalizada — não há resultado para confirmar.',
    }, { status: 400 })
  }
  if (match.confirmed_by) {
    return NextResponse.json({
      error: 'Resultado já foi confirmado pela mesa.',
      confirmed_by: match.confirmed_by,
    }, { status: 409 })
  }
  if (match.finished_by === user.id && role !== 'master_access') {
    return NextResponse.json({
      error: 'O resultado precisa ser confirmado por outro membro da mesa (não o árbitro que registrou).',
    }, { status: 403 })
  }

  await supabaseAdmin
    .from('event_matches')
    .update({
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  return NextResponse.json({ ok: true, confirmed_by: user.id, confirmed_at: new Date().toISOString() })
}

/**
 * DELETE — reabre o match (limpa confirmed + reseta winner + volta status pra in_progress).
 * Só master_access. Útil para corrigir resultado errado.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const role = await getRole(user.id)
  if (role !== 'master_access') {
    return NextResponse.json({
      error: 'Apenas master_access pode reabrir uma luta. Contate o suporte.',
    }, { status: 403 })
  }

  await supabaseAdmin
    .from('event_matches')
    .update({
      confirmed_by: null,
      confirmed_at: null,
      // status fica como 'finished' — admin pode editar resultado via PATCH normal.
    })
    .eq('id', matchId)

  return NextResponse.json({ ok: true })
}
