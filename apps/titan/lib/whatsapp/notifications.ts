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
  return sendTemplate(phone, 'lrsj_atleta_boas_vindas_v2', [atleta.nome_completo])
}

/**
 * Pagamento de inscrição confirmado.
 *
 * Template Meta: lrsj_evento_pagamento_confirmado
 *   {{1}} nome, {{2}} evento_nome, {{3}} valor_brl
 */
export async function notifyAtletaPagamentoEvento(atleta: {
  nome_completo: string
  telefone: string | null
  evento_nome: string
  valor_brl: string
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null
  try {
    return await sendTemplate(phone, 'lrsj_evento_pagamento_confirmado', [
      atleta.nome_completo,
      atleta.evento_nome,
      atleta.valor_brl,
    ])
  } catch (err) {
    console.warn('[whatsapp pagamento evento] template indisponível:', err)
    return null
  }
}

/**
 * Lembrete de pesagem (24h antes do evento).
 *
 * Template Meta: lrsj_pesagem_lembrete
 *   {{1}} nome, {{2}} evento_nome, {{3}} data, {{4}} local
 */
export async function notifyAtletaPesagemLembrete(atleta: {
  nome_completo: string
  telefone: string | null
  evento_nome: string
  data: string
  local: string
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null
  try {
    return await sendTemplate(phone, 'lrsj_pesagem_lembrete', [
      atleta.nome_completo,
      atleta.evento_nome,
      atleta.data,
      atleta.local,
    ])
  } catch (err) {
    console.warn('[whatsapp pesagem lembrete] template indisponível:', err)
    return null
  }
}

/**
 * Aviso "sua próxima luta" — N minutos antes da hora estimada.
 *
 * Template Meta: lrsj_proxima_luta
 *   {{1}} nome, {{2}} categoria, {{3}} tatame, {{4}} ordem_na_fila
 */
export async function notifyAtletaProximaLuta(atleta: {
  nome_completo: string
  telefone: string | null
  categoria: string
  tatame: string
  ordem_na_fila: string
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null
  try {
    return await sendTemplate(phone, 'lrsj_proxima_luta', [
      atleta.nome_completo,
      atleta.categoria,
      atleta.tatame,
      atleta.ordem_na_fila,
    ])
  } catch (err) {
    console.warn('[whatsapp proxima luta] template indisponível:', err)
    return null
  }
}

/**
 * Confirmação de inscrição em evento.
 *
 * ⚠️ Requer template registrado e aprovado no Meta Business Manager:
 *   nome:   lrsj_inscricao_evento_confirmada
 *   params: {{1}} nome, {{2}} evento_nome, {{3}} data, {{4}} proximos_passos
 *
 * Enquanto o template não estiver aprovado, retorna null silenciosamente.
 */
export async function notifyAtletaInscricaoConfirmada(atleta: {
  nome_completo: string
  telefone: string | null
  evento_nome: string
  evento_data: string
  proximos_passos: string
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null
  try {
    return await sendTemplate(phone, 'lrsj_inscricao_evento_confirmada', [
      atleta.nome_completo,
      atleta.evento_nome,
      atleta.evento_data,
      atleta.proximos_passos,
    ])
  } catch (err) {
    console.warn('[whatsapp inscricao confirmada] template não disponível:', err)
    return null
  }
}

export async function notifyAtletaPlanoVencendo(atleta: {
  nome_completo: string
  telefone: string | null
  data_expiracao: string
}) {
  const phone = normalizePhone(atleta.telefone)
  if (!phone) return null
  const dataFormatada = new Date(atleta.data_expiracao + 'T12:00:00').toLocaleDateString('pt-BR')
  return sendTemplate(phone, 'lrsj_atleta_plano_vencendo_v2', [atleta.nome_completo, dataFormatada])
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
  return sendTemplate(phone, 'lrsj_academia_anuidade_vencendo_v2', [responsavel, academia.nome, dataFormatada])
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
  return sendTemplate(phone, 'lrsj_academia_anuidade_vencida_v2', [responsavel, academia.nome, dataFormatada])
}

// Notifica o coordenador da federação sobre nova solicitação de filiação
// Template: lrsj_fed_novo_cadastro — variáveis: {{1}} nome, {{2}} email_ou_telefone
export async function notifyFederacaoNovoCadastro(atleta: {
  nome_completo: string
  email?: string | null
  telefone?: string | null
}) {
  const coordPhone = process.env.FEDERATION_COORD_PHONE || '5555984085000'
  const contato = atleta.email || atleta.telefone || 'não informado'

  return sendTemplate(coordPhone, 'lrsj_fed_novo_cadastro', [
    atleta.nome_completo,
    contato,
  ])
}
