import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { GraduacaoOpcao } from '@/lib/registro/lote'

/** Leitura de planilha/lista de atletas escrita à mão (foto ou PDF) com Claude (visão). */

const MODELO = 'claude-opus-5-5'

const LinhaSchema = z.object({
  nome_completo: z.string(),
  data_nascimento: z.string().nullable().describe('YYYY-MM-DD'),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  genero: z.enum(['Masculino', 'Feminino']).nullable(),
  cpf: z.string().nullable(),
  rg: z.string().nullable(),
  kyu_dan_id: z.number().int().nullable().describe('id da tabela de faixas fornecida; null se não houver faixa escrita'),
  responsavel_nome: z.string().nullable(),
  responsavel_telefone: z.string().nullable(),
  responsavel_cpf: z.string().nullable(),
  duvidas: z.array(z.string()).describe('Campos desta linha com leitura incerta, ex.: "data de nascimento borrada"'),
})
const PlanilhaSchema = z.object({
  legivel: z.boolean(),
  linhas: z.array(LinhaSchema),
})
export type LinhaExtraida = z.infer<typeof LinhaSchema>

type MidiaImagem = 'image/jpeg' | 'image/png' | 'image/webp'

export async function extrairPlanilhaManuscrita(
  arquivo: { bytes: Buffer; mediaType: string },
  graduacoes: GraduacaoOpcao[]
): Promise<{ linhas: LinhaExtraida[] } | { erro: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { erro: 'Leitura automática indisponível (ANTHROPIC_API_KEY não configurada).' }

  const tabela = graduacoes.map((g) => `${g.id}: ${g.cor_faixa} (${g.kyu_dan})`).join('\n')
  const prompt = `Esta é a foto ou o PDF de uma lista de atletas de uma academia de judô, possivelmente escrita à mão.
Transcreva uma linha por atleta, na ordem em que aparecem. Ignore cabeçalhos, rabiscos e linhas vazias.

Regras:
- Transcreva somente o que está escrito. Não invente nem complete dados: use null quando não houver.
- Datas no formato YYYY-MM-DD (as datas brasileiras vêm como dia/mês/ano).
- Telefones, CPF e RG: só os dígitos (RG pode ter letra no final).
- Gênero só se estiver escrito ou for claramente indicado (M/F).
- Faixa: escolha o id da tabela abaixo que corresponde à faixa escrita. "Preta" sem grau é o 1º dan. Se não houver faixa, null.
- Se uma linha tiver dados de pai, mãe ou responsável, coloque-os nos campos de responsável.
- Liste em "duvidas" o que você não conseguiu ler com segurança.

Tabela de faixas (id: cor (graduação)):
${tabela}`

  const data = arquivo.bytes.toString('base64')
  const bloco: Anthropic.Beta.BetaContentBlockParam = arquivo.mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: arquivo.mediaType as MidiaImagem, data } }

  try {
    const client = new Anthropic()
    const stream = client.beta.messages.stream({
      model: MODELO,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(PlanilhaSchema) },
      messages: [{ role: 'user', content: [bloco, { type: 'text', text: prompt }] }],
    })
    const resposta = await stream.finalMessage()
    if (resposta.stop_reason === 'refusal') return { erro: 'Não foi possível ler esta imagem.' }
    if (resposta.stop_reason === 'max_tokens') return { erro: 'A lista é longa demais para uma foto só. Divida em mais fotos.' }
    const texto = resposta.content.find((b) => b.type === 'text')
    const parsed = PlanilhaSchema.safeParse(texto?.type === 'text' ? JSON.parse(texto.text) : null)
    if (!parsed.success) return { erro: 'Não foi possível interpretar a leitura. Tente outra foto.' }
    if (!parsed.data.legivel && !parsed.data.linhas.length) return { erro: 'Imagem ilegível. Fotografe de perto, com boa luz e sem sombra.' }
    const ids = new Set(graduacoes.map((g) => g.id))
    return {
      linhas: parsed.data.linhas.map((l) => ({ ...l, kyu_dan_id: l.kyu_dan_id != null && ids.has(l.kyu_dan_id) ? l.kyu_dan_id : null })),
    }
  } catch (err) {
    console.error('[extracao-planilha] falha na IA:', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err)
    return { erro: 'A leitura automática falhou. Tente de novo em instantes.' }
  }
}
