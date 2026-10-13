import { supabaseAdmin } from '@/lib/supabase/admin'
import { calcularTaxa, FEDERACOES_REGISTRO } from '@/lib/registro/federacao'
import { ARTE_COM_KYU_DAN, isMenorDeIdade } from '@/lib/registro/atleta'

const txt = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
  return s || null
}

/** Ficha como lida de academia_atleta_fichas (select *). */
type Ficha = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export interface PagadorSugerido { name: string; identity: string; email: string; phone: string }

export type ResultadoPedido =
  | { ok: true; pedido_id: string; valor: number; descricao: string; pagador: PagadorSugerido }
  | { ok: false; status: number; error: string }

/**
 * Passo 4 (federação): valida os dados que a federação exige, completa o que faltava no cadastro,
 * calcula a taxa no servidor e cria/atualiza o filiacao_pedidos (PENDENTE, aguardando pagamento).
 * Usado pelo registro individual e pelo registro em bloco.
 */
export async function criarPedidoFederacao(criadoPor: string, ficha: Ficha, d: Record<string, unknown>): Promise<ResultadoPedido> {
  const federacaoId = txt(d.federacao_id)
  if (!federacaoId || !FEDERACOES_REGISTRO.includes(federacaoId)) {
    return { ok: false, status: 400, error: 'Escolha a federação' }
  }

  const { data: atleta } = await supabaseAdmin
    .from('stakeholders')
    .select('nome_completo, data_nascimento, genero, cpf, email, telefone, kyu_dan_id')
    .eq('id', ficha.stakeholder_id)
    .maybeSingle()
  if (!atleta) return { ok: false, status: 404, error: 'Atleta não encontrado' }

  // Dados que a federação exige e ainda faltavam podem vir neste passo.
  const genero = atleta.genero || txt(d.genero)
  const cpfNovo = txt(d.cpf)?.replace(/\D/g, '') || null
  if (cpfNovo && cpfNovo.length !== 11) return { ok: false, status: 400, error: 'CPF deve ter 11 dígitos' }
  const cpf = atleta.cpf || cpfNovo
  const kyuDanId = atleta.kyu_dan_id as number | null
  const nomePatch = txt(d.nome_patch)?.toUpperCase().slice(0, 24) || null
  const tamanho = txt(d.tamanho_patch)?.toUpperCase()
  const cor = txt(d.cor_patch)?.toUpperCase()
  const projetoSocial = d.projeto_social === true

  const faltando: string[] = []
  if (ficha.arte_marcial !== ARTE_COM_KYU_DAN || !kyuDanId || kyuDanId === 24) faltando.push('graduação de judô')
  if (!genero) faltando.push('gênero')
  if (!cpf && !ficha.rg) faltando.push('CPF ou RG')
  if (!nomePatch) faltando.push('nome no back number')
  if (!tamanho || !['P', 'M', 'G'].includes(tamanho)) faltando.push('tamanho do back number')
  if (!cor || !['AZUL', 'ROSA'].includes(cor)) faltando.push('cor do back number')
  if (!ficha.documento_path || !ficha.verificacao_status) faltando.push('foto do documento de identidade')
  if (faltando.length) return { ok: false, status: 400, error: `Falta: ${faltando.join(', ')}` }
  if (ficha.verificacao_status === 'divergente' && d.enviar_para_revisao !== true) {
    return { ok: false, status: 400, error: 'O documento não conferiu. Envie outra foto ou mande para revisão da federação.' }
  }

  const pessoal: Record<string, unknown> = {}
  if (!atleta.genero && genero) pessoal.genero = genero
  if (!atleta.cpf && cpfNovo) pessoal.cpf = cpfNovo
  if (Object.keys(pessoal).length) {
    const { error: e } = await supabaseAdmin.from('stakeholders').update(pessoal).eq('id', ficha.stakeholder_id)
    if (e) return { ok: false, status: 409, error: /duplicate|unique/i.test(e.message) ? 'Este CPF já está cadastrado em outra conta.' : e.message }
  }

  const taxa = await calcularTaxa(federacaoId, kyuDanId!, projetoSocial)
  if (!taxa) return { ok: false, status: 400, error: 'A federação ainda não tem taxa cadastrada para esta graduação' }

  const { data: existente } = await supabaseAdmin
    .from('filiacao_pedidos')
    .select('id, status, pago_em')
    .eq('stakeholder_id', ficha.stakeholder_id)
    .eq('federacao_id', federacaoId)
    .maybeSingle()
  if (existente?.status === 'APROVADO') return { ok: false, status: 409, error: 'Atleta já filiado a esta federação' }
  if (existente?.pago_em) return { ok: false, status: 409, error: 'Esta filiação já foi paga e está em análise na federação' }

  // A federação revisa o documento por um link temporário (bucket privado).
  const { data: assinado } = await supabaseAdmin.storage.from('documentos-identidade').createSignedUrl(ficha.documento_path, 60 * 60 * 24 * 30)

  const { data: pedido, error: pedErr } = await supabaseAdmin
    .from('filiacao_pedidos')
    .upsert({
      stakeholder_id: ficha.stakeholder_id,
      academia_id: ficha.academia_id,
      federacao_id: federacaoId,
      status: 'PENDENTE',
      observacao: ficha.verificacao_status === 'aprovado' ? 'Aguardando pagamento' : 'Aguardando pagamento — documento vai para revisão',
      url_documento_id: assinado?.signedUrl ?? null,
      verificacao_status: ficha.verificacao_status,
      verificacao_documento: ficha.verificacao_documento,
      dados_formulario: {
        origem: 'registro_academia',
        tipo: 'FILIACAO',
        ficha_id: ficha.id,
        kyu_dan_id: kyuDanId,
        nome_patch: nomePatch,
        tamanho_patch: tamanho,
        cor_patch: cor,
        projeto_social: projetoSocial,
        valor: taxa.valor,
        taxa_descricao: `${taxa.descricao} (${taxa.ano})`,
        url_foto: ficha.foto_url,
        genero,
        data_nascimento: atleta.data_nascimento,
        cpf,
        submetido_por_academia: criadoPor,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stakeholder_id,federacao_id' })
    .select('id')
    .single()
  if (pedErr) return { ok: false, status: 500, error: pedErr.message }

  await supabaseAdmin.from('academia_atleta_fichas').update({ filiacao_pedido_id: pedido.id, updated_at: new Date().toISOString() }).eq('id', ficha.id)

  // Quem paga: o responsável (menor) ou o próprio atleta. O CPF é exigido pelo Safe2Pay.
  const menor = isMenorDeIdade(atleta.data_nascimento)
  const pagador = menor
    ? { name: ficha.responsavel_nome ?? '', identity: ficha.responsavel_cpf ?? '', email: ficha.responsavel_email || atleta.email || '', phone: ficha.responsavel_telefone ?? atleta.telefone ?? '' }
    : { name: atleta.nome_completo ?? '', identity: cpf ?? '', email: atleta.email ?? '', phone: atleta.telefone ?? '' }

  return { ok: true, pedido_id: pedido.id, valor: taxa.valor, descricao: taxa.descricao, pagador }
}
