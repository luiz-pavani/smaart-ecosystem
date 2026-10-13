import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarLote, resolverStaffRegistro } from '@/lib/registro/server'
import { criarAtletaRegistro } from '@/lib/registro/criar'
import { calcularTaxa, FEDERACOES_REGISTRO } from '@/lib/registro/federacao'
import { ARTE_COM_KYU_DAN, isMenorDeIdade, normalizarTelefone } from '@/lib/registro/atleta'
import { validarLinha, type LinhaLote } from '@/lib/registro/lote'

type Params = { params: Promise<{ loteId: string }> }

/** GET — fichas do lote com situação de acesso, documento e filiação (tela de documentos e pagamento). */
export async function GET(_req: NextRequest, { params }: Params) {
  const { loteId } = await params
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })
  const lote = await carregarLote(staff, loteId)
  if (!lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })

  const { data: fichas } = await supabaseAdmin
    .from('academia_atleta_fichas')
    .select('id, stakeholder_id, canal_acesso, ativacao_enviada_em, rg, foto_url, verificacao_status, verificacao_documento, filiar_federacao_id, filiacao_pedido_id, responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone')
    .eq('lote_id', loteId)
    .order('created_at')
  const ids = (fichas ?? []).map((f) => f.stakeholder_id)
  const [{ data: atletas }, { data: pedidos }, { data: graduacoes }] = await Promise.all([
    supabaseAdmin.from('stakeholders').select('id, nome_completo, data_nascimento, genero, cpf, email, telefone, kyu_dan_id').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
    supabaseAdmin.from('filiacao_pedidos').select('id, stakeholder_id, federacao_id, status, pago_em, dados_formulario').in('stakeholder_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
    supabaseAdmin.from('kyu_dan').select('id, cor_faixa, kyu_dan'),
  ])
  const porId = new Map((atletas ?? []).map((a) => [a.id, a]))
  const grad = new Map((graduacoes ?? []).map((g) => [g.id, `${g.cor_faixa} | ${g.kyu_dan}`]))

  const linhas = await Promise.all((fichas ?? []).map(async (f) => {
    const a = porId.get(f.stakeholder_id)
    const fed = f.filiar_federacao_id
    const pedido = (pedidos ?? []).find((p) => p.stakeholder_id === f.stakeholder_id && (!fed || p.federacao_id === fed)) ?? null
    const verif = f.verificacao_documento as { motivo?: string } | null
    return {
      ficha_id: f.id,
      stakeholder_id: f.stakeholder_id,
      nome: a?.nome_completo ?? '—',
      data_nascimento: a?.data_nascimento ?? null,
      menor: isMenorDeIdade(a?.data_nascimento),
      genero: a?.genero ?? null,
      contato: f.canal_acesso === 'email' ? a?.email : a?.telefone,
      canal: f.canal_acesso,
      ativacao_enviada: !!f.ativacao_enviada_em,
      kyu_dan_id: a?.kyu_dan_id ?? null,
      graduacao: a?.kyu_dan_id ? grad.get(a.kyu_dan_id) ?? null : null,
      tem_documento_numero: !!(a?.cpf || f.rg),
      foto_url: f.foto_url,
      verificacao_status: f.verificacao_status,
      verificacao_motivo: verif?.motivo ?? null,
      federacao_id: fed,
      taxa: fed && a?.kyu_dan_id ? await calcularTaxa(fed, a.kyu_dan_id, false) : null,
      taxa_projeto_social: fed && a?.kyu_dan_id ? await calcularTaxa(fed, a.kyu_dan_id, true) : null,
      pedido: pedido ? { id: pedido.id, status: pedido.status, pago: !!pedido.pago_em, valor: Number((pedido.dados_formulario as Record<string, unknown> | null)?.valor) || null } : null,
    }
  }))

  return NextResponse.json({ lote, linhas })
}

/** POST { linha } — cria um atleta do lote (conta, ficha, cadastro e graduação). Uma linha por chamada. */
export async function POST(req: NextRequest, { params }: Params) {
  const { loteId } = await params
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })
  const lote = await carregarLote(staff, loteId)
  if (!lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })

  const l = (await req.json().catch(() => ({}))).linha as LinhaLote | undefined
  if (!l) return NextResponse.json({ error: 'Linha ausente' }, { status: 400 })
  const erros = validarLinha(l)
  if (erros.length) return NextResponse.json({ error: `Corrija: ${erros.join(', ')}` }, { status: 400 })

  const r = await criarAtletaRegistro(lote.academia_id, staff.userId, {
    nome_completo: l.nome_completo, data_nascimento: l.data_nascimento, canal: l.canal, contato: l.contato, lote_id: lote.id,
  })
  if (!r.ok) return NextResponse.json({ error: r.error, existente: r.existente }, { status: r.status })

  // Dados de cadastro e graduação da linha. A conta já existe: erros aqui viram aviso, não desfazem o registro.
  const avisos: string[] = []
  const pessoal: Record<string, unknown> = {}
  if (l.genero) pessoal.genero = l.genero
  if (l.kyu_dan_id) pessoal.kyu_dan_id = l.kyu_dan_id
  const cpf = l.documento_tipo === 'cpf' ? l.documento.replace(/\D/g, '') : ''
  if (cpf) pessoal.cpf = cpf
  if (Object.keys(pessoal).length) {
    const { error: e } = await supabaseAdmin.from('stakeholders').update(pessoal).eq('id', r.stakeholder_id)
    if (e && cpf && /duplicate|unique/i.test(e.message)) {
      delete pessoal.cpf
      avisos.push('CPF já usado em outra conta — não foi gravado')
      await supabaseAdmin.from('stakeholders').update(pessoal).eq('id', r.stakeholder_id)
    } else if (e) avisos.push(e.message)
  }

  const { error: fe } = await supabaseAdmin
    .from('academia_atleta_fichas')
    .update({
      rg: l.documento_tipo === 'rg' ? l.documento.replace(/[^0-9a-zA-Z]/g, '').toUpperCase() || null : null,
      responsavel_nome: l.responsavel_nome.trim() || null,
      responsavel_cpf: l.responsavel_cpf.replace(/\D/g, '') || null,
      responsavel_telefone: normalizarTelefone(l.responsavel_telefone),
      responsavel_email: l.responsavel_email.trim().toLowerCase() || null,
      arte_marcial: l.kyu_dan_id ? ARTE_COM_KYU_DAN : null,
      etapa: 'concluido',
      filiar_federacao_id: l.filiar ? FEDERACOES_REGISTRO[0] : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', r.ficha_id)
  if (fe) avisos.push(fe.message)

  return NextResponse.json({ ficha_id: r.ficha_id, stakeholder_id: r.stakeholder_id, ativacao: r.ativacao, avisos }, { status: 201 })
}
