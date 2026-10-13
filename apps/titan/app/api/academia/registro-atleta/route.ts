import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { academiaDoRegistro, resolverStaffRegistro } from '@/lib/registro/server'
import { criarAtletaRegistro } from '@/lib/registro/criar'

/**
 * GET /api/academia/registro-atleta?academia_id= — opções do wizard: academia, planos ativos e graduações.
 */
export async function GET(req: NextRequest) {
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })

  const academiaId = academiaDoRegistro(staff, req.nextUrl.searchParams.get('academia_id'))
  if (!academiaId) return NextResponse.json({ error: 'Informe a academia' }, { status: 400 })

  const [{ data: academia }, { data: planos }, { data: graduacoes }] = await Promise.all([
    supabaseAdmin.from('academias').select('id, nome, sigla').eq('id', academiaId).maybeSingle(),
    supabaseAdmin
      .from('academia_planos')
      .select('id, nome, valor, periodicidade, duracao_meses')
      .eq('academia_id', academiaId)
      .eq('ativo', true)
      .order('ordem'),
    supabaseAdmin.from('kyu_dan').select('id, cor_faixa, kyu_dan, ordem').eq('ativo', true).order('ordem'),
  ])
  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  return NextResponse.json({ academia, planos: planos ?? [], graduacoes: graduacoes ?? [] })
}

/**
 * POST /api/academia/registro-atleta — passo 1 do registro individual.
 * Body: { nome_completo, data_nascimento, canal: 'email'|'whatsapp', contato, academia_id? }
 */
export async function POST(req: NextRequest) {
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })

  const body = await req.json().catch(() => ({}))
  const academiaId = academiaDoRegistro(staff, body.academia_id)
  if (!academiaId) return NextResponse.json({ error: 'Usuário sem academia vinculada' }, { status: 400 })

  const r = await criarAtletaRegistro(academiaId, staff.userId, body)
  if (!r.ok) return NextResponse.json({ error: r.error, existente: r.existente }, { status: r.status })
  return NextResponse.json({ ficha_id: r.ficha_id, stakeholder_id: r.stakeholder_id, menor: r.menor, ativacao: r.ativacao }, { status: 201 })
}
