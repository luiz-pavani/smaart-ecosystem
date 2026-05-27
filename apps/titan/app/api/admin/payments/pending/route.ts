import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/admin/payments/pending
 *
 * Lista divergências operacionais que indicam um pagamento que pode ter ficado em limbo:
 *   - webhooks recebidos mas não processados (processed=false)
 *   - pagamentos com >24h em status 'aguardando' ou 'pendente'
 *
 * Acesso: master_access apenas.
 */

const MASTER_ROLES = new Set(['master_access', 'admin', 'master'])

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: stake } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!MASTER_ROLES.has(stake?.role ?? '')) {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
  }

  // Webhooks não-processados (com erro ou aguardando retry)
  const { data: webhooks } = await supabaseAdmin
    .from('webhook_events')
    .select('id, provider, external_id, event_type, reference, status_code, attempts, processing_error, received_at, last_attempt_at')
    .eq('processed', false)
    .order('received_at', { ascending: false })
    .limit(100)

  // Pagamentos pendentes há muito tempo
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: stalePayments } = await supabaseAdmin
    .from('pagamentos')
    .select('id, stakeholder_id, referencia_tipo, referencia_id, status, valor, safe2pay_id, created_at, updated_at')
    .in('status', ['aguardando', 'pendente'])
    .lt('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({
    webhooks_pendentes: webhooks ?? [],
    pagamentos_em_limbo: stalePayments ?? [],
    summary: {
      webhooks_pendentes: webhooks?.length ?? 0,
      pagamentos_em_limbo: stalePayments?.length ?? 0,
    },
  })
}
