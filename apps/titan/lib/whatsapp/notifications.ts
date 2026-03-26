import { sendTemplate } from './meta'

// ─────────────────────────────────────────────────────────────────────────────
// Templates cadastrados no Meta Business Manager — params CONFIRMADOS via API:
//   lrsj_atleta_boas_vindas         — {{1}} nome
//   lrsj_atleta_plano_vencendo      — {{1}} nome, {{2}} data_vencimento
//   lrsj_atleta_plano_vencido       — {{1}} nome, {{2}} data_vencimento
//   lrsj_academia_anuidade_vencendo — {{1}} responsavel, {{2}} academia, {{3}} data
//   lrsj_academia_anuidade_vencida  — {{1}} responsavel, {{2}} academia, {{3}} data
// ─────────────────────────────────────────────────────────────────────────────

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') ? digits : `55${digits}`
}

export async function notifyAtletaBoasVindas(atleta: {
  nome_completo: string
  telefone: string | null
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null
  return sendTemplate(phone, 'lrsj_atleta_boas_vindas', [atleta.nome_completo])
}

export async function notifyAtletaPlanoVencendo(atleta: {
  nome_completo: string
  telefone: string | null
  data_expiracao: string
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null
  const dataFormatada = new Date(atleta.data_expiracao + 'T12:00:00').toLocaleDateString('pt-BR')
  return sendTemplate(phone, 'lrsj_atleta_plano_vencendo', [atleta.nome_completo, dataFormatada])
}

export async function notifyAtletaPlanoVencido(atleta: {
  nome_completo: string
  telefone: string | null
  data_expiracao: string
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null
  const dataFormatada = new Date(atleta.data_expiracao + 'T12:00:00').toLocaleDateString('pt-BR')
  return sendTemplate(phone, 'lrsj_atleta_plano_vencido', [atleta.nome_completo, dataFormatada])
}

export async function notifyAcademiaAnualidadeVencendo(academia: {
  nome: string
  responsavel_nome: string | null
  responsavel_telefone: string | null
  anualidade_vencimento: string
}) {
  const phone = normalizePhone(academia.responsavel_telefone)
  if (!phone) return null
  const dataFormatada = new Date(academia.anualidade_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')
  const responsavel = academia.responsavel_nome || academia.nome
  return sendTemplate(phone, 'lrsj_academia_anuidade_vencendo', [responsavel, academia.nome, dataFormatada])
}

export async function notifyAcademiaAnualidadeVencida(academia: {
  nome: string
  responsavel_nome: string | null
  responsavel_telefone: string | null
  anualidade_vencimento: string
}) {
  const phone = normalizePhone(academia.responsavel_telefone)
  if (!phone) return null
  const dataFormatada = new Date(academia.anualidade_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')
  const responsavel = academia.responsavel_nome || academia.nome
  return sendTemplate(phone, 'lrsj_academia_anuidade_vencida', [responsavel, academia.nome, dataFormatada])
}

// Notifica o coordenador da federação sobre nova solicitação de filiação
// Template: lrsj_fed_novo_cadastro — variáveis: {{1}} nome, {{2}} email_ou_telefone
export async function notifyFederacaoNovoCadastro(atleta: {
  nome_completo: string
  email?: string | null
  telefone?: string | null
}) {
  const coordPhone = process.env.FEDERATION_COORD_PHONE || '5551968340131'
  const contato = atleta.email || atleta.telefone || 'não informado'

  return sendTemplate(coordPhone, 'lrsj_fed_novo_cadastro', [
    atleta.nome_completo,
    contato,
  ])
}
