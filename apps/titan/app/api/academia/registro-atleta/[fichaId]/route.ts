import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarFicha, resolverStaffRegistro } from '@/lib/registro/server'
import { calcularTaxa, FEDERACOES_REGISTRO } from '@/lib/registro/federacao'
import {
  ARTES_MARCIAIS,
  ARTE_COM_KYU_DAN,
  CONDICOES_SAUDE,
  FORMAS_PAGAMENTO,
  isMenorDeIdade,
  normalizarTelefone,
  type PassoCadastro,
  type PassoFiliacao,
} from '@/lib/registro/atleta'

type Params = { params: Promise<{ fichaId: string }> }

const txt = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
  return s || null
}
const data = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null)
const inteiro = (v: unknown) => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** GET — ficha + dados do atleta + histórico, para retomar o wizard. */
export async function GET(_req: NextRequest, { params }: Params) {
  const { fichaId } = await params
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })

  const ficha = await carregarFicha(staff, fichaId)
  if (!ficha) return NextResponse.json({ error: 'Ficha não encontrada' }, { status: 404 })

  const [{ data: atleta }, { data: historico }] = await Promise.all([
    supabaseAdmin
      .from('stakeholders')
      .select('id, nome_completo, data_nascimento, email, telefone, cpf, genero, kyu_dan_id')
      .eq('id', ficha.stakeholder_id)
      .maybeSingle(),
    supabaseAdmin
      .from('graduacao_historico')
      .select('id, arte_marcial, kyu_dan_id, graduacao_texto, data_graduacao, entidade')
      .eq('stakeholder_id', ficha.stakeholder_id)
      .order('data_graduacao', { ascending: true, nullsFirst: true }),
  ])

  return NextResponse.json({ ficha, atleta, historico: historico ?? [] })
}

/**
 * PATCH — grava um passo do wizard.
 * Body: { passo: 'cadastro', dados: PassoCadastro } | { passo: 'filiacao', dados: PassoFiliacao }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { fichaId } = await params
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })

  const ficha = await carregarFicha(staff, fichaId)
  if (!ficha) return NextResponse.json({ error: 'Ficha não encontrada' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const agora = new Date().toISOString()

  if (body.passo === 'cadastro') {
    const d = (body.dados ?? {}) as PassoCadastro
    const doc = txt(d.documento)
    const tipoDoc = d.documento_tipo === 'rg' ? 'rg' : 'cpf'
    const cpf = doc && tipoDoc === 'cpf' ? doc.replace(/\D/g, '') : null
    const rg = doc && tipoDoc === 'rg' ? doc.replace(/[^0-9a-zA-Z]/g, '').toUpperCase() : null
    if (cpf && cpf.length !== 11) return NextResponse.json({ error: 'CPF deve ter 11 dígitos' }, { status: 400 })

    // Menor de idade: o responsável é obrigatório já no cadastro (mesmo quando o resto é pulado).
    const { data: atleta } = await supabaseAdmin
      .from('stakeholders')
      .select('data_nascimento')
      .eq('id', ficha.stakeholder_id)
      .maybeSingle()
    const menor = isMenorDeIdade(atleta?.data_nascimento)
    const respNome = txt(d.responsavel_nome)
    const respCpf = txt(d.responsavel_cpf)?.replace(/\D/g, '') || null
    const respTelefone = normalizarTelefone(d.responsavel_telefone)
    if (menor && (!respNome || !respCpf || !respTelefone)) {
      return NextResponse.json({ error: 'Atleta menor de idade: informe nome, CPF e telefone do responsável' }, { status: 400 })
    }
    if (respCpf && respCpf.length !== 11) return NextResponse.json({ error: 'CPF do responsável deve ter 11 dígitos' }, { status: 400 })

    const pessoal: Record<string, unknown> = {}
    if (cpf) pessoal.cpf = cpf
    if (txt(d.genero)) pessoal.genero = txt(d.genero)
    if (Object.keys(pessoal).length) {
      const { error: e } = await supabaseAdmin.from('stakeholders').update(pessoal).eq('id', ficha.stakeholder_id)
      if (e) {
        const msg = /duplicate|unique/i.test(e.message) ? 'Este CPF já está cadastrado em outra conta.' : e.message
        return NextResponse.json({ error: msg }, { status: 409 })
      }
    }

    const { error: e } = await supabaseAdmin
      .from('academia_atleta_fichas')
      .update({
        rg,
        responsavel_nome: respNome,
        responsavel_cpf: respCpf,
        responsavel_telefone: respTelefone,
        responsavel_email: txt(d.responsavel_email)?.toLowerCase() || null,
        responsavel_parentesco: txt(d.responsavel_parentesco),
        cep: txt(d.cep)?.replace(/\D/g, '') || null,
        logradouro: txt(d.logradouro),
        numero: txt(d.numero),
        complemento: txt(d.complemento),
        bairro: txt(d.bairro),
        cidade: txt(d.cidade),
        uf: txt(d.uf)?.toUpperCase().slice(0, 2) || null,
        contato_emergencia_nome: txt(d.contato_emergencia_nome),
        contato_emergencia_telefone: normalizarTelefone(d.contato_emergencia_telefone) ?? txt(d.contato_emergencia_telefone),
        tipo_sanguineo: txt(d.tipo_sanguineo),
        condicoes_saude: (Array.isArray(d.condicoes_saude) ? d.condicoes_saude : [])
          .filter((c) => CONDICOES_SAUDE.some((k) => k.tipo === c?.tipo))
          .map((c) => ({ tipo: c.tipo, detalhe: txt(c.detalhe) ?? '' })),
        observacoes_saude: txt(d.observacoes_saude),
        como_conheceu: txt(d.como_conheceu),
        etapa: ficha.etapa === 'concluido' ? 'concluido' : 'filiacao',
        updated_at: agora,
      })
      .eq('id', ficha.id)
    if (e) return NextResponse.json({ error: e.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.passo === 'filiacao') {
    const d = (body.dados ?? {}) as PassoFiliacao
    const arte = txt(d.arte_marcial)
    if (!arte || !(ARTES_MARCIAIS as readonly string[]).includes(arte)) {
      return NextResponse.json({ error: 'Escolha a arte marcial' }, { status: 400 })
    }
    const isJudo = arte === ARTE_COM_KYU_DAN
    const kyuDanId = isJudo ? inteiro(d.kyu_dan_id) : null
    const graduacaoTexto = isJudo ? null : txt(d.graduacao_texto)
    if (isJudo ? !kyuDanId : !graduacaoTexto) {
      return NextResponse.json({ error: 'Informe a graduação atual' }, { status: 400 })
    }

    const planoId = txt(d.plano_id)
    if (planoId) {
      const { data: plano } = await supabaseAdmin
        .from('academia_planos')
        .select('id')
        .eq('id', planoId)
        .eq('academia_id', ficha.academia_id)
        .maybeSingle()
      if (!plano) return NextResponse.json({ error: 'Plano não pertence a esta academia' }, { status: 400 })
    }
    const forma = txt(d.forma_pagamento)
    if (forma && !FORMAS_PAGAMENTO.some((f) => f.value === forma)) {
      return NextResponse.json({ error: 'Forma de pagamento inválida' }, { status: 400 })
    }
    const valor = d.valor == null || d.valor === ('' as unknown) ? null : Number(d.valor)
    if (valor != null && (!Number.isFinite(valor) || valor < 0)) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }
    const parcelas = inteiro(d.parcelas)
    const diaVenc = inteiro(d.dia_vencimento)

    const { error: e } = await supabaseAdmin
      .from('academia_atleta_fichas')
      .update({
        arte_marcial: arte,
        graduacao_texto: graduacaoTexto,
        data_ultima_graduacao: data(d.data_ultima_graduacao),
        plano_id: planoId,
        valor,
        parcelas: parcelas && parcelas <= 24 ? parcelas : null,
        forma_pagamento: forma,
        dia_vencimento: diaVenc && diaVenc <= 31 ? diaVenc : null,
        data_inicio: data(d.data_inicio),
        etapa: 'concluido',
        updated_at: agora,
      })
      .eq('id', ficha.id)
    if (e) return NextResponse.json({ error: e.message }, { status: 500 })

    if (kyuDanId) {
      await supabaseAdmin.from('stakeholders').update({ kyu_dan_id: kyuDanId }).eq('id', ficha.stakeholder_id)
    }

    // Histórico desta arte é reescrito a cada gravação do passo (o wizard sempre manda a lista inteira).
    const historico = (d.historico ?? [])
      .map((h) => ({
        stakeholder_id: ficha.stakeholder_id,
        arte_marcial: arte,
        kyu_dan_id: isJudo ? inteiro(h.kyu_dan_id) : null,
        graduacao_texto: isJudo ? null : txt(h.graduacao_texto),
        data_graduacao: data(h.data_graduacao),
        entidade: txt(h.entidade),
        criado_por: staff.userId,
      }))
      .filter((h) => h.kyu_dan_id || h.graduacao_texto)
    await supabaseAdmin
      .from('graduacao_historico')
      .delete()
      .eq('stakeholder_id', ficha.stakeholder_id)
      .eq('arte_marcial', arte)
    if (historico.length) {
      const { error: he } = await supabaseAdmin.from('graduacao_historico').insert(historico)
      if (he) return NextResponse.json({ error: `Histórico de faixas: ${he.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (body.passo === 'federacao') {
    const d = (body.dados ?? {}) as Record<string, unknown>
    const federacaoId = txt(d.federacao_id)
    if (!federacaoId || !FEDERACOES_REGISTRO.includes(federacaoId)) {
      return NextResponse.json({ error: 'Escolha a federação' }, { status: 400 })
    }

    const { data: atleta } = await supabaseAdmin
      .from('stakeholders')
      .select('nome_completo, data_nascimento, genero, cpf, email, telefone, kyu_dan_id')
      .eq('id', ficha.stakeholder_id)
      .maybeSingle()
    if (!atleta) return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })

    // Dados que a federação exige e ainda faltavam podem vir neste passo.
    const genero = atleta.genero || txt(d.genero)
    const cpfNovo = txt(d.cpf)?.replace(/\D/g, '') || null
    if (cpfNovo && cpfNovo.length !== 11) return NextResponse.json({ error: 'CPF deve ter 11 dígitos' }, { status: 400 })
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
    if (!ficha.foto_url) faltando.push('foto do atleta')
    if (!ficha.documento_path || !ficha.verificacao_status) faltando.push('foto do documento de identidade')
    if (faltando.length) return NextResponse.json({ error: `Falta: ${faltando.join(', ')}` }, { status: 400 })
    if (ficha.verificacao_status === 'divergente' && d.enviar_para_revisao !== true) {
      return NextResponse.json({ error: 'O documento não conferiu. Envie outra foto ou mande para revisão da federação.' }, { status: 400 })
    }

    const pessoal: Record<string, unknown> = {}
    if (!atleta.genero && genero) pessoal.genero = genero
    if (!atleta.cpf && cpfNovo) pessoal.cpf = cpfNovo
    if (Object.keys(pessoal).length) {
      const { error: e } = await supabaseAdmin.from('stakeholders').update(pessoal).eq('id', ficha.stakeholder_id)
      if (e) return NextResponse.json({ error: /duplicate|unique/i.test(e.message) ? 'Este CPF já está cadastrado em outra conta.' : e.message }, { status: 409 })
    }

    const taxa = await calcularTaxa(federacaoId, kyuDanId!, projetoSocial)
    if (!taxa) return NextResponse.json({ error: 'A federação ainda não tem taxa cadastrada para esta graduação' }, { status: 400 })

    const { data: existente } = await supabaseAdmin
      .from('filiacao_pedidos')
      .select('id, status, pago_em')
      .eq('stakeholder_id', ficha.stakeholder_id)
      .eq('federacao_id', federacaoId)
      .maybeSingle()
    if (existente?.status === 'APROVADO') return NextResponse.json({ error: 'Atleta já filiado a esta federação' }, { status: 409 })
    if (existente?.pago_em) return NextResponse.json({ error: 'Esta filiação já foi paga e está em análise na federação' }, { status: 409 })

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
          submetido_por_academia: staff.userId,
        },
        updated_at: agora,
      }, { onConflict: 'stakeholder_id,federacao_id' })
      .select('id')
      .single()
    if (pedErr) return NextResponse.json({ error: pedErr.message }, { status: 500 })

    await supabaseAdmin.from('academia_atleta_fichas').update({ filiacao_pedido_id: pedido.id, updated_at: agora }).eq('id', ficha.id)

    // Quem paga: o responsável (menor) ou o próprio atleta. O CPF é exigido pelo Safe2Pay.
    const menor = isMenorDeIdade(atleta.data_nascimento)
    const pagador = menor
      ? { name: ficha.responsavel_nome ?? '', identity: ficha.responsavel_cpf ?? '', email: ficha.responsavel_email || atleta.email || '', phone: ficha.responsavel_telefone ?? atleta.telefone ?? '' }
      : { name: atleta.nome_completo ?? '', identity: cpf ?? '', email: atleta.email ?? '', phone: atleta.telefone ?? '' }

    return NextResponse.json({ pedido_id: pedido.id, valor: taxa.valor, descricao: taxa.descricao, pagador })
  }

  return NextResponse.json({ error: 'Passo inválido' }, { status: 400 })
}
