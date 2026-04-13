import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/checkout/status?pagamento_id=xxx
 * Retorna o status atual de um pagamento. Usado pelo polling do Pix.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const pagamentoId = req.nextUrl.searchParams.get('pagamento_id')
  if (!pagamentoId) return NextResponse.json({ error: 'pagamento_id obrigatório' }, { status: 400 })

  const { data: pag } = await supabaseAdmin
    .from('pagamentos')
    .select('id, status, pix_expiracao, referencia_tipo, referencia_id')
    .eq('id', pagamentoId)
    .eq('stakeholder_id', user.id)
    .maybeSingle()

  if (!pag) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })

  const expirado = pag.pix_expiracao
    ? new Date(pag.pix_expiracao) < new Date()
    : false

  return NextResponse.json({
    pagamento_id: pag.id,
    status: expirado && pag.status === 'pendente' ? 'expirado' : pag.status,
    pix_expiracao: pag.pix_expiracao,
    referencia_tipo: pag.referencia_tipo,
    referencia_id: pag.referencia_id,
  })
}
