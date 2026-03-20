import { sendTemplate } from './meta'

// ─────────────────────────────────────────────────────────────────────────────
// Templates cadastrados no Meta Business Manager (WhatsApp → Gerenciar modelos)
//
// Nomes dos templates (devem ser idênticos aos cadastrados na Meta):
//   lrsj_atleta_boas_vindas       — variáveis: {{1}} nome, {{2}} academia
//   lrsj_atleta_plano_vencendo    — variáveis: {{1}} nome, {{2}} dias, {{3}} data
//   lrsj_atleta_plano_vencido     — variáveis: {{1}} nome
//   lrsj_academia_anuidade_vencendo — variáveis: {{1}} academia, {{2}} dias, {{3}} data
//   lrsj_academia_anuidade_vencida  — variáveis: {{1}} academia
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
  academia?: string | null
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null

  return sendTemplate(phone, 'lrsj_atleta_boas_vindas', [
    atleta.nome_completo,
    atleta.academia || 'sua academia',
  ])
}

export async function notifyAtletaPlanoVencendo(atleta: {
  nome_completo: string
  telefone: string | null
  data_expiracao: string
  dias: number
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null

  const dataFormatada = new Date(atleta.data_expiracao).toLocaleDateString('pt-BR')

  return sendTemplate(phone, 'lrsj_atleta_plano_vencendo', [
    atleta.nome_completo,
    String(atleta.dias),
    dataFormatada,
  ])
}

export async function notifyAtletaPlanoVencido(atleta: {
  nome_completo: string
  telefone: string | null
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null

  return sendTemplate(phone, 'lrsj_atleta_plano_vencido', [
    atleta.nome_completo,
  ])
}

export async function notifyAcademiaAnualidadeVencendo(academia: {
  nome: string
  responsavel_telefone: string | null
  anualidade_vencimento: string
  dias: number
}) {
  const phone = normalizePhone(academia.responsavel_telefone)
  if (!phone) return null

  const dataFormatada = new Date(academia.anualidade_vencimento).toLocaleDateString('pt-BR')

  return sendTemplate(phone, 'lrsj_academia_anuidade_vencendo', [
    academia.nome,
    String(academia.dias),
    dataFormatada,
  ])
}

export async function notifyAcademiaAnualidadeVencida(academia: {
  nome: string
  responsavel_telefone: string | null
}) {
  const phone = normalizePhone(academia.responsavel_telefone)
  if (!phone) return null

  return sendTemplate(phone, 'lrsj_academia_anuidade_vencida', [
    academia.nome,
  ])
}
