/**
 * Registro individual de atleta pela academia — constantes e helpers puros (client + server).
 * Tabelas: academia_atleta_fichas, graduacao_historico (migration 049).
 */

export type CanalAcesso = 'email' | 'whatsapp'
export type EtapaFicha = 'cadastro' | 'filiacao' | 'concluido'

/** Judô usa a tabela kyu_dan; as demais artes guardam a graduação em texto. */
export const ARTES_MARCIAIS = ['Judô', 'Jiu-Jitsu', 'Karatê', 'Taekwondo', 'Muay Thai', 'Luta Olímpica', 'Outra'] as const
export const ARTE_COM_KYU_DAN = 'Judô'

export const FORMAS_PAGAMENTO = [
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
] as const
export type FormaPagamento = typeof FORMAS_PAGAMENTO[number]['value']

/** Sistema ABO + fator Rh (os 8 tipos), mais a opção de não saber. */
export const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não sabe'] as const

/** Condições de saúde marcáveis na ficha; cada uma tem um detalhe livre. */
export const CONDICOES_SAUDE = [
  { tipo: 'alergia', rotulo: 'Alergias', exemplo: 'Alimentos, medicamentos, picadas de inseto, látex…' },
  { tipo: 'cronica', rotulo: 'Doença crônica', exemplo: 'Asma, diabetes, epilepsia, cardiopatia, hipertensão…' },
  { tipo: 'medicamento', rotulo: 'Medicamento de uso contínuo', exemplo: 'Nome, dose e horário' },
  { tipo: 'lesao', rotulo: 'Lesão, cirurgia ou restrição física', exemplo: 'Joelho operado em 2024, evitar quedas para trás…' },
  { tipo: 'deficiencia', rotulo: 'Deficiência', exemplo: 'Física, visual, auditiva, intelectual…' },
  { tipo: 'aprendizagem', rotulo: 'Neurodivergência / aprendizagem', exemplo: 'TEA, TDAH, dislexia, TOD — e o que ajuda na aula' },
  { tipo: 'emocional', rotulo: 'Saúde mental / emocional', exemplo: 'Ansiedade, acompanhamento psicológico…' },
  { tipo: 'outra', rotulo: 'Outra condição', exemplo: 'Descreva' },
] as const
export type TipoCondicaoSaude = typeof CONDICOES_SAUDE[number]['tipo']
export interface CondicaoSaude { tipo: TipoCondicaoSaude; detalhe: string }

export const MAIORIDADE = 18

/** Telefone BR em dígitos com DDI 55 — mesmo formato de stakeholders.telefone e do login por OTP. */
export function normalizarTelefone(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
}

export function emailValido(raw: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((raw ?? '').trim())
}

/** Idade em anos completos na data de referência (default: hoje). null se a data for inválida. */
export function idadeEm(dataNascimento: string | null | undefined, ref = new Date()): number | null {
  if (!dataNascimento) return null
  const [y, m, d] = dataNascimento.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  let idade = ref.getFullYear() - y
  if (ref.getMonth() + 1 < m || (ref.getMonth() + 1 === m && ref.getDate() < d)) idade--
  return idade
}

export function isMenorDeIdade(dataNascimento: string | null | undefined): boolean {
  const idade = idadeEm(dataNascimento)
  return idade != null && idade < MAIORIDADE
}

export type TipoDocumento = 'cpf' | 'rg'

export interface PassoCadastro {
  documento_tipo?: TipoDocumento | null
  documento?: string | null
  genero?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  contato_emergencia_nome?: string | null
  contato_emergencia_telefone?: string | null
  tipo_sanguineo?: string | null
  condicoes_saude?: CondicaoSaude[] | null
  observacoes_saude?: string | null
  como_conheceu?: string | null
  responsavel_nome?: string | null
  responsavel_cpf?: string | null
  responsavel_telefone?: string | null
  responsavel_email?: string | null
  responsavel_parentesco?: string | null
}

export interface GraduacaoHistoricoInput {
  kyu_dan_id?: number | null
  graduacao_texto?: string | null
  data_graduacao?: string | null
  entidade?: string | null
}

export interface PassoFiliacao {
  arte_marcial: string
  kyu_dan_id?: number | null
  graduacao_texto?: string | null
  data_ultima_graduacao?: string | null
  historico?: GraduacaoHistoricoInput[]
  plano_id?: string | null
  valor?: number | null
  parcelas?: number | null
  forma_pagamento?: FormaPagamento | null
  dia_vencimento?: number | null
  data_inicio?: string | null
}

/** Endereço por CEP (ViaCEP). null se o CEP não existir ou a consulta falhar. */
export async function buscarCep(cep: string): Promise<{ logradouro: string; bairro: string; cidade: string; uf: string } | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const d = await res.json()
    if (d.erro) return null
    return { logradouro: d.logradouro ?? '', bairro: d.bairro ?? '', cidade: d.localidade ?? '', uf: d.uf ?? '' }
  } catch {
    return null
  }
}
