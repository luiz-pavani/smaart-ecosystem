/**
 * Registro de atletas em bloco — modelo de linha, leitura de planilha e validação (client + server).
 */
import { emailValido, idadeEm, normalizarTelefone, MAIORIDADE, type CanalAcesso, type TipoDocumento } from './atleta'

export interface LinhaLote {
  nome_completo: string
  data_nascimento: string          // YYYY-MM-DD
  canal: CanalAcesso
  contato: string
  genero: string                   // Masculino | Feminino | ''
  documento_tipo: TipoDocumento
  documento: string
  kyu_dan_id: number | null
  responsavel_nome: string
  responsavel_cpf: string
  responsavel_telefone: string
  responsavel_email: string
  filiar: boolean
}

export const LINHA_VAZIA: LinhaLote = {
  nome_completo: '', data_nascimento: '', canal: 'whatsapp', contato: '', genero: '', documento_tipo: 'cpf', documento: '',
  kyu_dan_id: null, responsavel_nome: '', responsavel_cpf: '', responsavel_telefone: '', responsavel_email: '', filiar: true,
}

export const MAX_LINHAS_LOTE = 200

/** Colunas do modelo de planilha, na ordem do download. */
export const COLUNAS_MODELO = [
  'Nome completo', 'Data de nascimento', 'WhatsApp', 'Email', 'Gênero', 'CPF', 'RG', 'Faixa',
  'Responsável', 'CPF do responsável', 'Telefone do responsável', 'Email do responsável', 'Filiar à federação',
] as const

export interface GraduacaoOpcao { id: number; cor_faixa: string | null; kyu_dan: string | null }

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Faixa em texto livre ("azul", "1º kyu", "preta 2 dan", "laranja") → kyu_dan.id. */
export function resolverGraduacao(texto: unknown, graduacoes: GraduacaoOpcao[]): number | null {
  const t = norm(texto)
  if (!t) return null
  const dan = t.match(/(\d{1,2})\s*(?:o\s*)?dan/)
  if (dan) return graduacoes.find((g) => norm(g.kyu_dan) === `${dan[1]} dan`)?.id ?? null
  const kyu = t.match(/(\d{1,2})\s*(?:o\s*)?ky/)
  if (kyu) return graduacoes.find((g) => norm(g.kyu_dan) === `${kyu[1]} kyu`)?.id ?? null
  if (/^preta$/.test(t)) return graduacoes.find((g) => norm(g.kyu_dan) === '1 dan')?.id ?? null
  // Cor: igualdade exata primeiro ("azul" ≠ "cinza e azul"), depois a faixa combinada.
  return graduacoes.find((g) => norm(g.cor_faixa) === t)?.id
    ?? graduacoes.find((g) => norm(g.cor_faixa).replace(/ e /g, ' ') === t.replace(/ e /g, ' ').replace(/\//g, ' '))?.id
    ?? null
}

/** dd/mm/aaaa, dd-mm-aa, aaaa-mm-dd ou número de série do Excel → YYYY-MM-DD. */
export function normalizarData(v: unknown): string {
  if (typeof v === 'number' && v > 1000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000)
    return d.toISOString().slice(0, 10)
  }
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (m) {
    let ano = Number(m[3])
    if (ano < 100) ano += ano > new Date().getFullYear() % 100 ? 1900 : 2000
    return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return s
}

const ALIASES: Record<string, string[]> = {
  nome_completo: ['nome completo', 'nome', 'atleta', 'nome do atleta', 'aluno'],
  data_nascimento: ['data de nascimento', 'nascimento', 'data nasc', 'dt nascimento', 'data nascimento'],
  whatsapp: ['whatsapp', 'celular', 'telefone', 'fone', 'whats'],
  email: ['email', 'e mail'],
  genero: ['genero', 'sexo'],
  cpf: ['cpf', 'cpf do atleta'],
  rg: ['rg', 'identidade'],
  faixa: ['faixa', 'graduacao', 'kyu', 'kyu dan'],
  responsavel_nome: ['responsavel', 'nome do responsavel', 'responsavel legal'],
  responsavel_cpf: ['cpf do responsavel', 'cpf responsavel'],
  responsavel_telefone: ['telefone do responsavel', 'whatsapp do responsavel', 'celular do responsavel', 'telefone responsavel'],
  responsavel_email: ['email do responsavel', 'email responsavel'],
  filiar: ['filiar a federacao', 'filiar', 'federacao', 'filiacao'],
}

function campoDoCabecalho(h: string): string | null {
  const n = norm(h)
  for (const [campo, nomes] of Object.entries(ALIASES)) if (nomes.includes(n)) return campo
  return null
}

const sim = (v: unknown) => !/^(n|nao|no|0|false)$/.test(norm(v))

function genero(v: unknown): string {
  const n = norm(v)
  if (/^(f|fem|feminino|mulher)$/.test(n)) return 'Feminino'
  if (/^(m|masc|masculino|homem)$/.test(n)) return 'Masculino'
  return ''
}

/** Linhas de planilha (objetos com o cabeçalho como chave, ex.: XLSX.utils.sheet_to_json) → LinhaLote. */
export function linhasDaPlanilha(registros: Record<string, unknown>[], graduacoes: GraduacaoOpcao[]): LinhaLote[] {
  return registros
    .map((r) => {
      const v: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(r)) {
        const campo = campoDoCabecalho(k)
        if (campo && (v[campo] == null || v[campo] === '')) v[campo] = val
      }
      return montarLinha({
        nome_completo: v.nome_completo, data_nascimento: v.data_nascimento, whatsapp: v.whatsapp, email: v.email,
        genero: v.genero, cpf: v.cpf, rg: v.rg, faixa: v.faixa, responsavel_nome: v.responsavel_nome,
        responsavel_cpf: v.responsavel_cpf, responsavel_telefone: v.responsavel_telefone, responsavel_email: v.responsavel_email,
        filiar: v.filiar,
      }, graduacoes)
    })
    .filter((l) => l.nome_completo)
}

/** Campos soltos (planilha ou leitura da foto) → LinhaLote. WhatsApp tem prioridade como acesso. */
export function montarLinha(c: Record<string, unknown>, graduacoes: GraduacaoOpcao[]): LinhaLote {
  const whats = String(c.whatsapp ?? '').trim()
  const email = String(c.email ?? '').trim()
  const cpf = String(c.cpf ?? '').trim()
  const rg = String(c.rg ?? '').trim()
  return {
    ...LINHA_VAZIA,
    nome_completo: String(c.nome_completo ?? '').trim().replace(/\s+/g, ' '),
    data_nascimento: normalizarData(c.data_nascimento),
    canal: whats || !email ? 'whatsapp' : 'email',
    contato: whats || email,
    genero: genero(c.genero),
    documento_tipo: cpf || !rg ? 'cpf' : 'rg',
    documento: cpf || rg,
    kyu_dan_id: typeof c.kyu_dan_id === 'number' ? c.kyu_dan_id : resolverGraduacao(c.faixa, graduacoes),
    responsavel_nome: String(c.responsavel_nome ?? '').trim(),
    responsavel_cpf: String(c.responsavel_cpf ?? '').trim(),
    responsavel_telefone: String(c.responsavel_telefone ?? '').trim(),
    responsavel_email: String(c.responsavel_email ?? '').trim(),
    filiar: c.filiar == null || c.filiar === '' ? true : sim(c.filiar),
  }
}

/** Problemas que impedem criar a linha. Mesma regra no navegador (pré-visualização) e no servidor. */
export function validarLinha(l: LinhaLote): string[] {
  const erros: string[] = []
  if (l.nome_completo.trim().split(/\s+/).length < 2) erros.push('nome e sobrenome')
  const idade = idadeEm(l.data_nascimento)
  if (idade == null || idade < 0 || idade > 110) erros.push('data de nascimento')
  if (l.canal === 'email' ? !emailValido(l.contato) : !normalizarTelefone(l.contato)) erros.push(l.canal === 'email' ? 'email' : 'WhatsApp com DDD')
  if (l.documento_tipo === 'cpf' && l.documento && l.documento.replace(/\D/g, '').length !== 11) erros.push('CPF com 11 dígitos')
  if (idade != null && idade < MAIORIDADE && (!l.responsavel_nome.trim() || !normalizarTelefone(l.responsavel_telefone))) {
    erros.push('responsável (nome e telefone)')
  }
  if (l.responsavel_cpf && l.responsavel_cpf.replace(/\D/g, '').length !== 11) erros.push('CPF do responsável')
  if (l.filiar && !l.kyu_dan_id) erros.push('faixa (para filiar)')
  return erros
}
