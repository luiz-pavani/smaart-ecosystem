import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { academiaDoRegistro, resolverStaffRegistro } from '@/lib/registro/server'
import { MAX_LINHAS_LOTE } from '@/lib/registro/lote'

/** GET ?academia_id= — últimos lotes da academia (para retomar documentos e pagamento). */
export async function GET(req: NextRequest) {
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })
  const academiaId = academiaDoRegistro(staff, req.nextUrl.searchParams.get('academia_id'))
  if (!academiaId) return NextResponse.json({ error: 'Informe a academia' }, { status: 400 })

  const { data: lotes } = await supabaseAdmin
    .from('registro_lotes')
    .select('id, origem, total_linhas, created_at, fichas:academia_atleta_fichas(count)')
    .eq('academia_id', academiaId)
    .order('created_at', { ascending: false })
    .limit(10)
  return NextResponse.json({ lotes: lotes ?? [] })
}

/** POST { origem, total_linhas, academia_id? } — abre um lote antes de criar as linhas. */
export async function POST(req: NextRequest) {
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })
  const body = await req.json().catch(() => ({}))
  const academiaId = academiaDoRegistro(staff, body.academia_id)
  if (!academiaId) return NextResponse.json({ error: 'Usuário sem academia vinculada' }, { status: 400 })
  if (!['planilha', 'foto', 'manual'].includes(body.origem)) return NextResponse.json({ error: 'origem inválida' }, { status: 400 })
  const total = Number(body.total_linhas) || 0
  if (total < 1 || total > MAX_LINHAS_LOTE) return NextResponse.json({ error: `O lote deve ter de 1 a ${MAX_LINHAS_LOTE} atletas` }, { status: 400 })

  const { data, error: e } = await supabaseAdmin
    .from('registro_lotes')
    .insert({ academia_id: academiaId, criado_por: staff.userId, origem: body.origem, total_linhas: total })
    .select('id')
    .single()
  if (e) return NextResponse.json({ error: e.message }, { status: 500 })
  return NextResponse.json({ lote_id: data.id }, { status: 201 })
}
