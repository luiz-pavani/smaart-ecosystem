import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarFicha, resolverStaffRegistro } from '@/lib/registro/server'
import { verificarDocumento } from '@/lib/registro/verificacao-documento'

export const runtime = 'nodejs'
export const maxDuration = 60

type Params = { params: Promise<{ fichaId: string }> }

// Limite do corpo de requisição nas funções da Vercel (~4,5 MB); o navegador reduz as fotos antes de enviar.
const MAX_BYTES = 4.4 * 1024 * 1024

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
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Envie um arquivo' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Arquivo acima de 4 MB. Envie uma foto menor ou um PDF mais leve.' }, { status: 400 })
  const bruto = Buffer.from(await file.arrayBuffer())
  const ts = Date.now()

  // Imagens são normalizadas (orientação EXIF, tamanho, JPEG) — isso também converte HEIC quando o sharp suporta.
  const normalizar = async (lado: number) => {
    try {
      return await sharp(bruto).rotate().resize(lado, lado, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
    } catch {
      return null
    }
  }

  if (tipo === 'foto') {
    const jpg = await normalizar(900)
    if (!jpg) return NextResponse.json({ error: 'Formato de imagem não suportado. Use JPG ou PNG.' }, { status: 400 })
    const path = `fotos/${ficha.stakeholder_id}/foto_${ts}.jpg`
    const { error: upErr } = await supabaseAdmin.storage.from('atletas').upload(path, jpg, { contentType: 'image/jpeg', upsert: true })
    if (upErr) return NextResponse.json({ error: `Erro no upload: ${upErr.message}` }, { status: 500 })
    const url = supabaseAdmin.storage.from('atletas').getPublicUrl(path).data.publicUrl
    await supabaseAdmin.from('academia_atleta_fichas').update({ foto_url: url, updated_at: new Date().toISOString() }).eq('id', ficha.id)
    return NextResponse.json({ foto_url: url })
  }

  if (tipo !== 'documento') return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })

  const isPdf = file.type === 'application/pdf'
  const bytes = isPdf ? bruto : await normalizar(2000)
  if (!bytes) return NextResponse.json({ error: 'Formato não suportado. Use foto (JPG/PNG) ou PDF.' }, { status: 400 })
  const mediaType = isPdf ? 'application/pdf' : 'image/jpeg'
  const path = `${ficha.stakeholder_id}/documento_${ts}.${isPdf ? 'pdf' : 'jpg'}`
  const { error: upErr } = await supabaseAdmin.storage.from('documentos-identidade').upload(path, bytes, { contentType: mediaType, upsert: false })
  if (upErr) return NextResponse.json({ error: `Erro no upload: ${upErr.message}` }, { status: 500 })

  const { data: atleta } = await supabaseAdmin
    .from('stakeholders')
    .select('nome_completo, data_nascimento, cpf')
    .eq('id', ficha.stakeholder_id)
    .maybeSingle()

  const resultado = await verificarDocumento(
    { bytes, mediaType },
    { nome: atleta?.nome_completo ?? '', data_nascimento: atleta?.data_nascimento ?? null, cpf: atleta?.cpf ?? null, rg: ficha.rg ?? null }
  )

  await supabaseAdmin
    .from('academia_atleta_fichas')
    .update({
      documento_path: path,
      verificacao_status: resultado.status,
      verificacao_documento: resultado,
      verificado_em: resultado.verificado_em,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ficha.id)

  return NextResponse.json({ verificacao_status: resultado.status, verificacao: resultado })
}
