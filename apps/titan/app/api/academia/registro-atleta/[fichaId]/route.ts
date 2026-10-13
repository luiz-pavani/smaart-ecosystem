import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarFicha, resolverStaffRegistro } from '@/lib/registro/server'
import { criarPedidoFederacao } from '@/lib/registro/pedido'
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
    const r = await criarPedidoFederacao(staff.userId, ficha, (body.dados ?? {}) as Record<string, unknown>)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    return NextResponse.json({ pedido_id: r.pedido_id, valor: r.valor, descricao: r.descricao, pagador: r.pagador })
  }

  return NextResponse.json({ error: 'Passo inválido' }, { status: 400 })
}
