import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/atletas/self/planos
 * Returns active plans for the athlete's academia, plus academia payment info.
 *
 * GET /api/atletas/self/planos?cupom=CODIGO
 * Also validates a coupon code against the academia.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Resolve athlete's academia
  const { data: stakeholder } = await supabaseAdmin
    .from('stakeholders')
    .select('academia_id, nome_completo, email, telefone')
    .eq('id', user.id)
    .maybeSingle()

  if (!stakeholder?.academia_id) {
    return NextResponse.json({ error: 'Você não está vinculado a nenhuma academia' }, { status: 400 })
  }

  const academiaId = stakeholder.academia_id

  // Fetch academia basic info + payment status
  const { data: academia } = await supabaseAdmin
    .from('academias')
    .select('id, nome, sigla, pagamento_habilitado')
    .eq('id', academiaId)
    .maybeSingle()

  // Fetch only active plans
  const { data: planos } = await supabaseAdmin
    .from('academia_planos')
    .select('id, nome, descricao, valor, valor_original, periodicidade, duracao_meses, max_aulas_semana, beneficios, destaque')
    .eq('academia_id', academiaId)
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  // Fetch athlete's existing subscription (if any)
  const { data: assinatura } = await supabaseAdmin
    .from('academia_assinaturas')
    .select('id, plano_id, status, valor_pago, created_at, academia_planos(nome, periodicidade)')
    .eq('stakeholder_id', user.id)
    .eq('academia_id', academiaId)
    .in('status', ['ativa', 'suspensa'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Optionally validate a coupon
  let cupomValidado: any = null
  const codigoCupom = req.nextUrl.searchParams.get('cupom')

  if (codigoCupom) {
    const today = new Date().toISOString().split('T')[0]
    const { data: cupom } = await supabaseAdmin
      .from('academia_cupons')
      .select('*')
      .eq('academia_id', academiaId)
      .eq('codigo', codigoCupom.toUpperCase().trim())
      .eq('ativo', true)
      .maybeSingle()

    if (!cupom) {
      cupomValidado = { valido: false, erro: 'Cupom não encontrado ou inativo' }
    } else if (cupom.validade_fim && cupom.validade_fim < today) {
      cupomValidado = { valido: false, erro: 'Cupom expirado' }
    } else if (cupom.validade_inicio && cupom.validade_inicio > today) {
      cupomValidado = { valido: false, erro: 'Cupom ainda não está ativo' }
    } else if (cupom.uso_maximo && cupom.uso_atual >= cupom.uso_maximo) {
      cupomValidado = { valido: false, erro: 'Cupom esgotado' }
    } else {
      cupomValidado = {
        valido: true,
        id: cupom.id,
        codigo: cupom.codigo,
        tipo_desconto: cupom.tipo_desconto,
        valor_desconto: cupom.valor_desconto,
        valor_minimo: cupom.valor_minimo,
        plano_ids: cupom.plano_ids,
        descricao: cupom.descricao,
      }
    }
  }

  return NextResponse.json({
    academia: academia || null,
    planos: planos || [],
    assinatura_atual: assinatura || null,
    cupom: cupomValidado,
    customer: {
      name: stakeholder.nome_completo || '',
      identity: '',
      email: stakeholder.email || user.email || '',
      phone: stakeholder.telefone || '',
    },
  })
}
