import { supabaseAdmin } from '@/lib/supabase/admin'
import { avaliarDocumento, extrairDocumento, type ResultadoExtracao, type ResultadoVerificacao } from '@/lib/registro/verificacao-documento'

/** Limite do corpo de requisição nas funções da Vercel (~4,5 MB); o navegador reduz as fotos antes de enviar. */
export const MAX_BYTES_UPLOAD = 4.4 * 1024 * 1024

export type MidiaDocumento = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
export interface ArquivoDocumento { bytes: Buffer; mediaType: MidiaDocumento }

const ACEITOS: MidiaDocumento[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

/**
 * Valida tipo e tamanho. O navegador já reduz e converte as fotos para JPEG antes do envio
 * (sem processamento de imagem no servidor: o sharp não carrega no runtime da Vercel).
 */
export async function prepararArquivo(file: File): Promise<ArquivoDocumento | { erro: string }> {
  if (file.size === 0) return { erro: 'Arquivo vazio' }
  if (file.size > MAX_BYTES_UPLOAD) return { erro: 'Arquivo acima de 4 MB. Envie uma foto menor ou um PDF mais leve.' }
  const tipo = file.type as MidiaDocumento
  if (!ACEITOS.includes(tipo)) return { erro: 'Formato não suportado. Envie foto em JPG ou PNG, ou um PDF.' }
  return { bytes: Buffer.from(await file.arrayBuffer()), mediaType: tipo }
}

/** Ficha como lida de academia_atleta_fichas (select *). */
type Ficha = { id: string; stakeholder_id: string; rg?: string | null }

/**
 * Guarda o documento no bucket privado, compara com o cadastro do atleta e grava o resultado na ficha.
 * `extraido` permite reaproveitar uma leitura já feita (registro em bloco).
 */
export async function salvarDocumentoFicha(
  ficha: Ficha,
  arquivo: ArquivoDocumento,
  extraido?: ResultadoExtracao
): Promise<{ resultado: ResultadoVerificacao } | { erro: string }> {
  const ext = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' }[arquivo.mediaType]
  const path = `${ficha.stakeholder_id}/documento_${Date.now()}.${ext}`
  const { error: upErr } = await supabaseAdmin.storage
    .from('documentos-identidade')
    .upload(path, arquivo.bytes, { contentType: arquivo.mediaType, upsert: false })
  if (upErr) return { erro: `Erro no upload: ${upErr.message}` }

  const { data: atleta } = await supabaseAdmin
    .from('stakeholders')
    .select('nome_completo, data_nascimento, cpf')
    .eq('id', ficha.stakeholder_id)
    .maybeSingle()

  const resultado = avaliarDocumento(extraido ?? (await extrairDocumento(arquivo)), {
    nome: atleta?.nome_completo ?? '',
    data_nascimento: atleta?.data_nascimento ?? null,
    cpf: atleta?.cpf ?? null,
    rg: ficha.rg ?? null,
  })

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

  return { resultado }
}
