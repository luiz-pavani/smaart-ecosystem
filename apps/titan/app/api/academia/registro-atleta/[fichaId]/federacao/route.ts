import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { carregarFicha, resolverStaffRegistro } from '@/lib/registro/server'
import { calcularTaxa, FEDERACOES_REGISTRO } from '@/lib/registro/federacao'
import { ARTE_COM_KYU_DAN, isMenorDeIdade } from '@/lib/registro/atleta'

type Params = { params: Promise<{ fichaId: string }> }

/**
 * GET — estado do passo 4: federações disponíveis com a taxa deste atleta, dados que a federação
 * exige (o que já existe e o que falta), documento/foto enviados e pedido existente.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { fichaId } = await params
  const { staff, status, error } = await resolverStaffRegistro()
  if (!staff) return NextResponse.json({ error }, { status })
  const ficha = await carregarFicha(staff, fichaId)
  if (!ficha) return NextResponse.json({ error: 'Ficha não encontrada' }, { status: 404 })

  const [{ data: atleta }, { data: federacoes }, { data: pedidos }] = await Promise.all([
    supabaseAdmin
      .from('stakeholders')
      .select('nome_completo, data_nascimento, genero, cpf, email, telefone, kyu_dan_id')
      .eq('id', ficha.stakeholder_id)
      .maybeSingle(),
    supabaseAdmin.from('federacoes').select('id, nome, sigla').in('id', FEDERACOES_REGISTRO),
    supabaseAdmin
      .from('filiacao_pedidos')
      .select('id, federacao_id, status, verificacao_status, pago_em, dados_formulario')
      .eq('stakeholder_id', ficha.stakeholder_id),
  ])
  if (!atleta) return NextResponse.json({ error: 'Atleta não encontrado' }, { status: 404 })

  const kyuDanId = atleta.kyu_dan_id as number | null
  const graduacaoValida = ficha.arte_marcial === ARTE_COM_KYU_DAN && !!kyuDanId && kyuDanId !== 24
  const opcoes = await Promise.all((federacoes ?? []).map(async (f) => ({
    ...f,
    taxa: graduacaoValida ? await calcularTaxa(f.id, kyuDanId!, false) : null,
    taxa_projeto_social: graduacaoValida ? await calcularTaxa(f.id, kyuDanId!, true) : null,
    pedido: (pedidos ?? []).find((p) => p.federacao_id === f.id) ?? null,
  })))

  return NextResponse.json({
    federacoes: opcoes,
    bloqueio: graduacaoValida ? null : 'A filiação à LRSJ é de judô: informe a graduação de judô na etapa de filiação à academia.',
    atleta: {
      nome: atleta.nome_completo,
      data_nascimento: atleta.data_nascimento,
      genero: atleta.genero,
      cpf: atleta.cpf,
      rg: ficha.rg,
      menor: isMenorDeIdade(atleta.data_nascimento),
    },
    documento: {
      enviado: !!ficha.documento_path,
      verificacao_status: ficha.verificacao_status,
      verificacao: ficha.verificacao_documento,
    },
    foto_url: ficha.foto_url,
  })
}
