import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST /api/atletas/self/planos/contratar
 *
 * Body: { plano_id, cupom_id?, pagamento_id? }
 *
 * Creates an academia_assinaturas record linking the athlete to the plan.
 * Called after successful payment via CheckoutModal.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { plano_id, cupom_id, pagamento_id } = await req.json()

  if (!plano_id) {
    return NextResponse.json({ error: 'plano_id obrigatório' }, { status: 400 })
  }

  // Resolve athlete's academia
  const { data: stakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!stakeholder?.academia_id) {
    return NextResponse.json({ error: 'Você não está vinculado a uma academia' }, { status: 400 })
  }

  // Verify the plan belongs to the athlete's academia
  const { data: plano } = await supabaseAdmin
    .from('academia_planos')
    .select('id, nome, valor, periodicidade, academia_id')
    .eq('id', plano_id)
    .eq('academia_id', stakeholder.academia_id)
    .eq('ativo', true)
    .maybeSingle()

  if (!plano) {
    return NextResponse.json({ error: 'Plano não encontrado ou inativo' }, { status: 404 })
  }

  // Calculate final value (apply coupon if present)
  let valorFinal = plano.valor
  if (cupom_id) {
    const { data: cupom } = await supabaseAdmin
      .from('academia_cupons')
      .select('*')
      .eq('id', cupom_id)
      .eq('academia_id', stakeholder.academia_id)
      .eq('ativo', true)
      .maybeSingle()

    if (cupom) {
      // Validate coupon applies to this plan
      if (cupom.plano_ids && cupom.plano_ids.length > 0 && !cupom.plano_ids.includes(plano_id)) {
        return NextResponse.json({ error: 'Cupom não é válido para este plano' }, { status: 400 })
      }
      if (cupom.valor_minimo && plano.valor < cupom.valor_minimo) {
        return NextResponse.json({ error: 'Valor mínimo do cupom não atingido' }, { status: 400 })
      }

      if (cupom.tipo_desconto === 'percentual') {
        valorFinal = plano.valor * (1 - cupom.valor_desconto / 100)
      } else {
        valorFinal = Math.max(0, plano.valor - cupom.valor_desconto)
      }

      // Increment coupon usage
      await supabaseAdmin
        .from('academia_cupons')
        .update({ uso_atual: (cupom.uso_atual || 0) + 1 })
        .eq('id', cupom_id)
    }
  }

  // Cancel any existing active subscription for this athlete + academia
  await supabaseAdmin
    .from('academia_assinaturas')
    .update({ status: 'cancelada' })
    .eq('stakeholder_id', user.id)
    .eq('academia_id', stakeholder.academia_id)
    .in('status', ['ativa', 'suspensa'])

  // Create subscription
  const { data: assinatura, error } = await supabaseAdmin
    .from('academia_assinaturas')
    .insert({
      academia_id: stakeholder.academia_id,
      stakeholder_id: user.id,
      plano_id,
      cupom_id: cupom_id || null,
      status: 'ativa',
      valor_pago: Math.round(valorFinal * 100) / 100,
      metadata: { pagamento_id: pagamento_id || null },
    })
    .select('id, plano_id, status, valor_pago')
    .single()

  if (error) {
    console.error('[CONTRATAR] Erro ao criar assinatura:', error)
    return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 })
  }

  return NextResponse.json({ assinatura })
}
