import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'

/**
 * Verificação do documento de identidade do atleta com Claude (visão).
 * A IA só EXTRAI os dados impressos; a comparação com o cadastro é feita aqui, em código.
 */

const MODELO = 'claude-opus-5-5'

const ExtracaoSchema = z.object({
  legivel: z.boolean().describe('false se a imagem não permite ler nome e data de nascimento com segurança'),
  tipo_documento: z.enum(['RG', 'CIN', 'CNH', 'CPF', 'PASSAPORTE', 'CERTIDAO_NASCIMENTO', 'OUTRO', 'NAO_E_DOCUMENTO']),
  nome: z.string().nullable().describe('Nome completo exatamente como impresso'),
  data_nascimento: z.string().nullable().describe('YYYY-MM-DD'),
  cpf: z.string().nullable().describe('Somente dígitos'),
  rg: z.string().nullable().describe('Número do RG/registro geral, somente letras e dígitos'),
  sinais_de_problema: z.array(z.string()).describe('Indícios de adulteração, foto de tela, recorte, documento vencido etc. Vazio se nada notado'),
})
export type ExtracaoDocumento = z.infer<typeof ExtracaoSchema>

export type StatusVerificacao = 'aprovado' | 'divergente' | 'revisao_manual'

export interface ComparacaoCampo {
  campo: 'nome' | 'data_nascimento' | 'cpf' | 'rg'
  cadastro: string | null
  documento: string | null
  ok: boolean
}

export interface ResultadoVerificacao {
  status: StatusVerificacao
  motivo: string
  extracao: ExtracaoDocumento | null
  comparacao: ComparacaoCampo[]
  modelo: string
  verificado_em: string
}

export interface DadosCadastro {
  nome: string
  data_nascimento: string | null
  cpf: string | null
  rg: string | null
}

const MIDIAS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MIDIAS_DOCUMENTO = [...MIDIAS_IMAGEM, 'application/pdf'] as const

const PROMPT = `Esta é a foto ou o PDF de um documento de identidade brasileiro (RG, CIN, CNH, CPF, passaporte ou certidão de nascimento), enviado por uma academia de artes marciais para filiar um atleta a uma federação esportiva.

Extraia somente o que está impresso no documento. Não deduza nem complete dados que não estejam visíveis: use null quando um campo não aparecer ou estiver ilegível.
- nome: o nome do titular, como impresso (não o nome da mãe ou do pai).
- data_nascimento: no formato YYYY-MM-DD.
- cpf e rg: só os caracteres, sem pontos, traços ou barras.
- sinais_de_problema: registre indícios de que a imagem não é o documento original (foto de outra tela, montagem, partes cobertas, rasuras) ou de que o documento está vencido. Deixe vazio se nada chamar atenção.
Se a imagem não for um documento de identidade, use tipo_documento NAO_E_DOCUMENTO e legivel false.`

function normalizarNome(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const PARTICULAS = new Set(['DA', 'DE', 'DO', 'DAS', 'DOS', 'E'])

/** Nomes batem se são iguais sem acento, ou se todas as palavras do cadastro aparecem no documento (abreviações de nome do meio toleradas). */
export function nomesBatem(cadastro: string, documento: string | null): boolean {
  const a = normalizarNome(cadastro)
  const b = normalizarNome(documento)
  if (!a || !b) return false
  if (a === b) return true
  const pa = a.split(' ').filter((p) => !PARTICULAS.has(p))
  const pb = b.split(' ').filter((p) => !PARTICULAS.has(p))
  if (pa[0] !== pb[0] || pa[pa.length - 1] !== pb[pb.length - 1]) return false
  return pa.every((p) => pb.includes(p) || (p.length === 1 && pb.some((q) => q.startsWith(p))))
}

const soDigitos = (s: string | null | undefined) => (s ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase() || null

export function comparar(cadastro: DadosCadastro, ext: ExtracaoDocumento): ComparacaoCampo[] {
  const linhas: ComparacaoCampo[] = [
    { campo: 'nome', cadastro: cadastro.nome, documento: ext.nome, ok: nomesBatem(cadastro.nome, ext.nome) },
    {
      campo: 'data_nascimento',
      cadastro: cadastro.data_nascimento,
      documento: ext.data_nascimento,
      ok: !!cadastro.data_nascimento && cadastro.data_nascimento.slice(0, 10) === ext.data_nascimento,
    },
  ]
  // CPF/RG só entram na comparação quando existem dos dois lados.
  const cpfCad = soDigitos(cadastro.cpf)
  const cpfDoc = soDigitos(ext.cpf)
  if (cpfCad && cpfDoc) linhas.push({ campo: 'cpf', cadastro: cpfCad, documento: cpfDoc, ok: cpfCad === cpfDoc })
  const rgCad = soDigitos(cadastro.rg)
  const rgDoc = soDigitos(ext.rg)
  if (rgCad && rgDoc) linhas.push({ campo: 'rg', cadastro: rgCad, documento: rgDoc, ok: rgCad === rgDoc })
  return linhas
}

/** Envia o documento à IA e compara com o cadastro. Nunca lança: falhas viram 'revisao_manual'. */
export async function verificarDocumento(
  arquivo: { bytes: Buffer; mediaType: string },
  cadastro: DadosCadastro
): Promise<ResultadoVerificacao> {
  const agora = new Date().toISOString()
  const base = { modelo: MODELO, verificado_em: agora }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ...base, status: 'revisao_manual', motivo: 'Verificação automática indisponível (ANTHROPIC_API_KEY não configurada).', extracao: null, comparacao: [] }
  }

  const data = arquivo.bytes.toString('base64')
  const bloco: Anthropic.Beta.BetaContentBlockParam = arquivo.mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: arquivo.mediaType as typeof MIDIAS_IMAGEM[number], data } }

  try {
    const client = new Anthropic()
    const resposta = await client.beta.messages.parse({
      model: MODELO,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(ExtracaoSchema) },
      messages: [{ role: 'user', content: [bloco, { type: 'text', text: PROMPT }] }],
    })

    if (resposta.stop_reason === 'refusal' || !resposta.parsed_output) {
      return { ...base, status: 'revisao_manual', motivo: 'A verificação automática não conseguiu ler o documento.', extracao: null, comparacao: [] }
    }

    const ext = resposta.parsed_output
    if (!ext.legivel || ext.tipo_documento === 'NAO_E_DOCUMENTO') {
      return {
        ...base,
        status: 'divergente',
        motivo: ext.tipo_documento === 'NAO_E_DOCUMENTO' ? 'A imagem não parece ser um documento de identidade.' : 'Documento ilegível. Envie uma foto nítida, sem reflexo e com o documento inteiro.',
        extracao: ext,
        comparacao: [],
      }
    }

    const comparacao = comparar(cadastro, ext)
    const divergentes = comparacao.filter((c) => !c.ok)
    if (divergentes.length) {
      const rotulos: Record<ComparacaoCampo['campo'], string> = { nome: 'nome', data_nascimento: 'data de nascimento', cpf: 'CPF', rg: 'RG' }
      return { ...base, status: 'divergente', motivo: `Não confere com o cadastro: ${divergentes.map((d) => rotulos[d.campo]).join(', ')}.`, extracao: ext, comparacao }
    }
    if (ext.sinais_de_problema.length) {
      return { ...base, status: 'revisao_manual', motivo: `Dados conferem, mas a federação vai revisar: ${ext.sinais_de_problema.join('; ')}`, extracao: ext, comparacao }
    }
    return { ...base, status: 'aprovado', motivo: 'Documento confere com o cadastro.', extracao: ext, comparacao }
  } catch (err) {
    console.error('[verificacao-documento] falha na IA:', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err)
    return { ...base, status: 'revisao_manual', motivo: 'A verificação automática falhou. O documento vai para revisão da federação.', extracao: null, comparacao: [] }
  }
}
