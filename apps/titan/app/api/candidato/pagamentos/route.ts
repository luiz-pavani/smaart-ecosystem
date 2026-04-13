import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/candidato/pagamentos
 * Returns all payments for the candidato (referencia_tipo = 'profep').
 * Admin can pass ?stakeholder_id=UUID to view another candidate's payments.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: st } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = ['master_access', 'federacao_admin', 'admin'].includes(st?.role || '')

  // Admin can view another candidate's payments
  const targetId = isAdmin
    ? (req.nextUrl.searchParams.get('stakeholder_id') || user.id)
    : user.id

  // All profep payments for this candidate
  const { data: pagamentos, error } = await supabaseAdmin
    .from('pagamentos')
    .select('id, tipo, valor, status, safe2pay_id, pix_qr_code, pix_qr_code_url, pix_expiracao, metadata, created_at, updated_at')
    .eq('stakeholder_id', targetId)
    .eq('referencia_tipo', 'profep')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch inscription for status context
  const { data: inscricao } = await supabaseAdmin
    .from('candidato_inscricoes')
    .select('id, status_inscricao, status_pagamento, graduacao_pretendida, created_at')
    .eq('stakeholder_id', targetId)
    .maybeSingle()

  return NextResponse.json({
    pagamentos: pagamentos || [],
    inscricao: inscricao || null,
    isAdmin,
  })
}

/**
 * POST /api/candidato/pagamentos
 * Admin-only: register a manual payment (paid outside the system).
 *
 * Body: { stakeholder_id, valor, tipo, observacao? }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: st } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!['master_access', 'federacao_admin', 'admin'].includes(st?.role || '')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { stakeholder_id, valor, tipo, observacao } = await req.json()

  if (!stakeholder_id || !valor) {
    return NextResponse.json({ error: 'stakeholder_id e valor são obrigatórios' }, { status: 400 })
  }

  // Get the candidate's inscription
  const { data: inscricao } = await supabaseAdmin
    .from('candidato_inscricoes')
    .select('id')
    .eq('stakeholder_id', stakeholder_id)
    .maybeSingle()

  // Create the payment record as already paid
  const { data: pagamento, error } = await supabaseAdmin
    .from('pagamentos')
    .insert({
      stakeholder_id,
      referencia_tipo: 'profep',
      referencia_id: inscricao?.id || null,
      tipo: tipo || 'pix',
      valor: Number(valor),
      status: 'pago',
      metadata: {
        manual: true,
        registrado_por: user.id,
        observacao: observacao || 'Pagamento registrado manualmente pelo admin',
      },
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also update the inscription payment status to APROVADO
  if (inscricao?.id) {
    await supabaseAdmin
      .from('candidato_inscricoes')
      .update({ status_pagamento: 'APROVADO' })
      .eq('id', inscricao.id)
  }

  return NextResponse.json({ pagamento })
}

/**
 * PATCH /api/candidato/pagamentos
 * Admin-only: update payment status (mark as paid, cancelled, etc).
 *
 * Body: { pagamento_id, status, observacao? }
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: st } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!['master_access', 'federacao_admin', 'admin'].includes(st?.role || '')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { pagamento_id, status, observacao } = await req.json()

  if (!pagamento_id || !status) {
    return NextResponse.json({ error: 'pagamento_id e status são obrigatórios' }, { status: 400 })
  }

  // Get current payment to find the stakeholder
  const { data: currentPag } = await supabaseAdmin
    .from('pagamentos')
    .select('stakeholder_id')
    .eq('id', pagamento_id)
    .maybeSingle()

  const updates: Record<string, any> = { status }
  if (observacao) {
    updates.metadata = {
      status_alterado_por: user.id,
      status_alterado_em: new Date().toISOString(),
      observacao,
    }
  }

  const { data: pagamento, error } = await supabaseAdmin
    .from('pagamentos')
    .update(updates)
    .eq('id', pagamento_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If marking as pago, also update inscription
  if (status === 'pago' && currentPag?.stakeholder_id) {
    const { data: inscricao } = await supabaseAdmin
      .from('candidato_inscricoes')
      .select('id')
      .eq('stakeholder_id', currentPag.stakeholder_id)
      .maybeSingle()

    if (inscricao) {
      await supabaseAdmin
        .from('candidato_inscricoes')
        .update({ status_pagamento: 'APROVADO' })
        .eq('id', inscricao.id)
    }
  }

  return NextResponse.json({ pagamento })
}
