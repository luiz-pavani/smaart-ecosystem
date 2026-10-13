import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { emailDocumentosFiliacao } from '@/lib/email'
import { sendTemplate } from '@/lib/whatsapp/meta'
import { LRSJ_FED_UUID, upsertFiliacoesLrsj } from '@/lib/filiacao/lrsj'

/**
 * Registro de atleta — filiação à federação (passos 4 e 5) no servidor:
 * taxa calculada a partir de federacao_taxas_filiacao, conclusão da filiação após o pagamento
 * e entrega dos documentos por link (email + WhatsApp).
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://titan.smaartpro.com'

/** Hoje só a LRSJ grava filiações por este fluxo (upsertFiliacoesLrsj e o webhook são LRSJ). */
export const FEDERACOES_REGISTRO = [LRSJ_FED_UUID]

export interface Taxa { valor: number; descricao: string; ano: number }

/** Taxa vigente (ano mais recente até o atual) para a graduação. projeto_social só vale se houver tarifa própria. */
export async function calcularTaxa(federacaoId: string, kyuDanId: number, projetoSocial: boolean): Promise<Taxa | null> {
  const ano = new Date().getFullYear()
  const { data } = await supabaseAdmin
    .from('federacao_taxas_filiacao')
    .select('ano, kyu_dan_min, kyu_dan_max, projeto_social, valor, descricao')
    .eq('federacao_id', federacaoId)
    .lte('ano', ano)
    .order('ano', { ascending: false })
  if (!data?.length) return null
  const vigente = data.filter((t) => t.ano === data[0].ano)
  const naFaixa = vigente.filter((t) => kyuDanId >= t.kyu_dan_min && (t.kyu_dan_max == null || kyuDanId <= t.kyu_dan_max))
  const t = (projetoSocial && naFaixa.find((x) => x.projeto_social)) || naFaixa.find((x) => !x.projeto_social)
  return t ? { valor: Number(t.valor), descricao: t.descricao, ano: t.ano } : null
}

export async function isPedidoRegistroAcademia(pedidoId: string | null | undefined): Promise<boolean> {
  if (!pedidoId) return false
  const { data } = await supabaseAdmin.from('filiacao_pedidos').select('dados_formulario').eq('id', pedidoId).maybeSingle()
  return (data?.dados_formulario as Record<string, unknown> | null)?.origem === 'registro_academia'
}

/**
 * Chamado quando o pagamento de um pedido criado pelo registro da academia é confirmado
 * (webhook Safe2Pay ou cartão aprovado na hora). Documento aprovado pela IA → filiação ativa e
 * documentos enviados. Senão o pedido fica PENDENTE (pago) para a federação revisar.
 */
export async function concluirFiliacaoRegistro(pedidoId: string): Promise<void> {
  const { data: pedido } = await supabaseAdmin
    .from('filiacao_pedidos')
    .select('id, stakeholder_id, academia_id, federacao_id, status, verificacao_status, dados_formulario, url_documento_id, pago_em')
    .eq('id', pedidoId)
    .maybeSingle()
  if (!pedido) return
  const agora = new Date().toISOString()
  if (!pedido.pago_em) await supabaseAdmin.from('filiacao_pedidos').update({ pago_em: agora }).eq('id', pedido.id)
  if (pedido.status === 'APROVADO') return // idempotente: webhook repetido

  if (pedido.verificacao_status !== 'aprovado') {
    await supabaseAdmin
      .from('filiacao_pedidos')
      .update({ observacao: 'Pagamento confirmado — documento aguardando revisão da federação', updated_at: agora })
      .eq('id', pedido.id)
    return
  }

  const df = (pedido.dados_formulario ?? {}) as Record<string, unknown>
  const hoje = agora.slice(0, 10)
  const expira = new Date()
  expira.setFullYear(expira.getFullYear() + 1)

  const { error } = await upsertFiliacoesLrsj(supabaseAdmin, [{
    stakeholder_id: pedido.stakeholder_id,
    academia_id: pedido.academia_id,
    kyu_dan_id: (df.kyu_dan_id as number | undefined) ?? null,
    nome_patch: (df.nome_patch as string | undefined) ?? null,
    tamanho_patch: (df.tamanho_patch as string | undefined) ?? null,
    cor_patch: (df.cor_patch as string | undefined)?.toUpperCase() ?? null,
    url_foto: (df.url_foto as string | undefined) ?? null,
    url_documento_id: pedido.url_documento_id ?? null,
    plano_tipo: (df.projeto_social as boolean | undefined) ? 'projeto social' : null,
    status_membro: 'ativo',
    status_plano: 'Válido',
    data_adesao: hoje,
    data_expiracao: expira.toISOString().slice(0, 10),
    dados_validados: true,
    validado_em: agora,
    observacoes: 'Registro pela academia — documento verificado automaticamente',
  }])
  if (error) {
    console.error('[registro/federacao] erro ao gravar filiação:', error)
    return
  }

  await supabaseAdmin
    .from('filiacao_pedidos')
    .update({ status: 'APROVADO', revisado_em: agora, observacao: 'Pago e documento verificado — aprovado automaticamente', updated_at: agora })
    .eq('id', pedido.id)
  await supabaseAdmin.from('stakeholders').update({ federacao_id: pedido.federacao_id }).eq('id', pedido.stakeholder_id)

  await entregarDocumentosFiliacao(pedido.stakeholder_id, pedido.federacao_id)
}

/**
 * Cria o link de documentos e envia ao contato do atleta (e ao email do responsável, se houver).
 * WhatsApp usa o template definido em WHATSAPP_TEMPLATE_DOCUMENTOS ({{1}} nome, {{2}} link);
 * sem a variável, só email.
 */
export async function entregarDocumentosFiliacao(stakeholderId: string, federacaoId: string): Promise<{ link: string }> {
  const token = crypto.randomBytes(24).toString('base64url')
  await supabaseAdmin.from('documentos_entrega').insert({ token, stakeholder_id: stakeholderId, federacao_id: federacaoId })
  const link = `${BASE_URL}/documentos/${token}`

  const [{ data: atleta }, { data: federacao }, { data: ficha }] = await Promise.all([
    supabaseAdmin.from('stakeholders').select('nome_completo, email, telefone').eq('id', stakeholderId).maybeSingle(),
    supabaseAdmin.from('federacoes').select('nome, sigla').eq('id', federacaoId).maybeSingle(),
    supabaseAdmin
      .from('academia_atleta_fichas')
      .select('responsavel_email')
      .eq('stakeholder_id', stakeholderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  const nome = atleta?.nome_completo ?? 'Atleta'
  const fedNome = federacao?.sigla || federacao?.nome || 'federação'
  const agora = new Date().toISOString()

  const emails = [...new Set([atleta?.email, ficha?.responsavel_email].filter((e): e is string => !!e && !e.endsWith('.local')))]
  let enviouEmail = false
  for (const email of emails) {
    if (await emailDocumentosFiliacao({ email, nome, federacao: fedNome, link })) enviouEmail = true
  }

  let enviouWhats = false
  const template = process.env.WHATSAPP_TEMPLATE_DOCUMENTOS
  if (template && atleta?.telefone) {
    try {
      const res = await sendTemplate(atleta.telefone, template, [nome.split(' ')[0], link])
      enviouWhats = !!res && !res.error
    } catch (err) {
      console.warn('[registro/federacao] WhatsApp de documentos falhou:', err)
    }
  }

  await supabaseAdmin
    .from('documentos_entrega')
    .update({ enviado_email_em: enviouEmail ? agora : null, enviado_whatsapp_em: enviouWhats ? agora : null })
    .eq('token', token)
  return { link }
}

/** Valida o token de entrega (existe e não expirou) e registra o acesso. */
export async function carregarEntrega(token: string): Promise<{ stakeholder_id: string; federacao_id: string } | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null
  const { data } = await supabaseAdmin
    .from('documentos_entrega')
    .select('stakeholder_id, federacao_id, expira_em, acessos')
    .eq('token', token)
    .maybeSingle()
  if (!data || new Date(data.expira_em) < new Date()) return null
  await supabaseAdmin
    .from('documentos_entrega')
    .update({ acessos: (data.acessos ?? 0) + 1, ultimo_acesso_em: new Date().toISOString() })
    .eq('token', token)
  return { stakeholder_id: data.stakeholder_id, federacao_id: data.federacao_id }
}

/** Certificado de graduação só para kyu (faixas coloridas), como em AtletaDocumentos. */
export const temCertificadoKyu = (kyuDanId: number | null | undefined) => !!kyuDanId && kyuDanId >= 1 && kyuDanId <= 12
