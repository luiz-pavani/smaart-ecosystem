import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarFicha, resolverStaffRegistro } from '@/lib/registro/server'
import { prepararArquivo, salvarDocumentoFicha } from '@/lib/registro/documento'

export const runtime = 'nodejs'
export const maxDuration = 60

type Params = { params: Promise<{ fichaId: string }> }

/**
 * POST multipart { tipo: 'documento' | 'foto', file }
 * - foto: foto do atleta (carteira/back number) → bucket público atletas.
 * - documento: documento de identidade → bucket privado documentos-identidade + verificação por IA
 *   contra o cadastro (nome, nascimento, CPF/RG).
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { fichaId } = await params
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })
  const ficha = await carregarFicha(staff, fichaId)
  if (!ficha) return NextResponse.json({ error: 'Ficha não encontrada' }, { status: 404 })

  const form = await req.formData()
  const tipo = form.get('tipo')
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Envie um arquivo' }, { status: 400 })

  if (tipo === 'foto') {
    if (file.type === 'application/pdf') return NextResponse.json({ error: 'A foto precisa ser uma imagem' }, { status: 400 })
    const arq = await prepararArquivo(file)
    if ('erro' in arq) return NextResponse.json({ error: arq.erro }, { status: 400 })
    const ext = arq.mediaType.split('/')[1].replace('jpeg', 'jpg')
    const path = `fotos/${ficha.stakeholder_id}/foto_${Date.now()}.${ext}`
    const { error: upErr } = await supabaseAdmin.storage.from('atletas').upload(path, arq.bytes, { contentType: arq.mediaType, upsert: true })
    if (upErr) return NextResponse.json({ error: `Erro no upload: ${upErr.message}` }, { status: 500 })
    const url = supabaseAdmin.storage.from('atletas').getPublicUrl(path).data.publicUrl
    await supabaseAdmin.from('academia_atleta_fichas').update({ foto_url: url, updated_at: new Date().toISOString() }).eq('id', ficha.id)
    return NextResponse.json({ foto_url: url })
  }

  if (tipo !== 'documento') return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
  const arq = await prepararArquivo(file)
  if ('erro' in arq) return NextResponse.json({ error: arq.erro }, { status: 400 })
  const r = await salvarDocumentoFicha(ficha, arq)
  if ('erro' in r) return NextResponse.json({ error: r.erro }, { status: 500 })
  return NextResponse.json({ verificacao_status: r.resultado.status, verificacao: r.resultado })
}
