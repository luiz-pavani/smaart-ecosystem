import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolverStaffRegistro } from '@/lib/registro/server'
import { prepararArquivo } from '@/lib/registro/documento'
import { extrairPlanilhaManuscrita } from '@/lib/registro/extracao-planilha'

export const runtime = 'nodejs'
export const maxDuration = 300

/** POST multipart { file } — lê uma foto/PDF de lista de atletas (manuscrita ou impressa) e devolve as linhas. */
export async function POST(req: NextRequest) {
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })

  const file = (await req.formData()).get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Envie a foto da planilha' }, { status: 400 })
  const arq = await prepararArquivo(file)
  if ('erro' in arq) return NextResponse.json({ error: arq.erro }, { status: 400 })

  const { data: graduacoes } = await supabaseAdmin.from('kyu_dan').select('id, cor_faixa, kyu_dan').eq('ativo', true).neq('id', 24).order('ordem')
  const r = await extrairPlanilhaManuscrita(arq, graduacoes ?? [])
  if ('erro' in r) return NextResponse.json({ error: r.erro }, { status: 422 })
  return NextResponse.json({ linhas: r.linhas })
}
