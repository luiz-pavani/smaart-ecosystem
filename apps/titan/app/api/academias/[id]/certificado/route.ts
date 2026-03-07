import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      return NextResponse.json(
        { error: 'Supabase credentials missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(url, key)

    // Buscar dados da academia com federação
    const { data: academia, error: academiaError } = await supabase
      .from('academias')
      .select(`
        id,
        nome,
        sigla,
        cnpj,
        ativo,
        anualidade_status,
        anualidade_vencimento,
        endereco_rua,
        endereco_numero,
        endereco_bairro,
        endereco_cidade,
        endereco_estado,
        endereco_cep,
        responsavel_nome,
        federacao_id
      `)
      .eq('id', id)
      .single()

    if (academiaError || !academia) {
      console.error('❌ Academia query error:', academiaError)
      const isNotFound = academiaError?.code === 'PGRST116'
      return NextResponse.json(
        { error: isNotFound ? 'Academia não encontrada' : `Erro ao buscar academia: ${academiaError?.message || 'desconhecido'}` },
        { status: isNotFound ? 404 : 500 }
      )
    }

    const academiaElegivelCertificado = academia.ativo === true && academia.anualidade_status === 'paga'
    if (!academiaElegivelCertificado) {
      return NextResponse.json(
        { error: 'Certificado disponível apenas para academias Ativas com Anuidade Paga (em dia).' },
        { status: 403 }
      )
    }

    // Buscar federação separadamente
    const { data: federacao, error: federacaoError } = await supabase
      .from('federacoes')
      .select('nome, sigla, cnpj, cor_primaria, cor_secundaria, email, telefone, site, logo_url, endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, created_at')
      .eq('id', academia.federacao_id)
      .single()

    if (federacaoError || !federacao) {
      console.error('❌ Federação query error:', federacaoError)
      const isNotFound = federacaoError?.code === 'PGRST116'
      return NextResponse.json(
        { error: isNotFound ? 'Federação não encontrada para esta academia' : `Erro ao buscar federação: ${federacaoError?.message || 'desconhecido'}` },
        { status: isNotFound ? 404 : 500 }
      )
    }

    const isLrsj =
      federacao.sigla === 'LRSJ' ||
      federacao.nome?.toLowerCase().includes('liga riograndense de judô')

    const cnpjCertificado = isLrsj ? '05.503.443/0001-19' : federacao.cnpj
    const dataFundacaoCertificado = isLrsj
      ? new Date('2001-10-06').toISOString()
      : federacao.created_at

    // Gerar número de registro único
    const numeroRegistro = `${federacao.sigla || 'FED'}-${academia.id.substring(0, 8).toUpperCase()}-${new Date().getFullYear()}`

    // Dados para o certificado
    const certificadoData = {
      academia: {
        nome: academia.nome,
        sigla: academia.sigla,
        cnpj: academia.cnpj,
        endereco_rua: academia.endereco_rua,
        endereco_numero: academia.endereco_numero,
        endereco_bairro: academia.endereco_bairro,
        endereco_cidade: academia.endereco_cidade,
        endereco_estado: academia.endereco_estado,
        endereco_cep: academia.endereco_cep,
        responsavel_nome: academia.responsavel_nome,
      },
      federacao: {
        nome_completo: federacao.nome,
        sigla: federacao.sigla,
        cnpj: cnpjCertificado,
        data_fundacao: dataFundacaoCertificado,
        cor_primaria: federacao.cor_primaria,
        cor_secundaria: federacao.cor_secundaria,
        email: federacao.email,
        telefone: federacao.telefone,
        site: federacao.site,
        logo_url: federacao.logo_url,
        endereco_rua: federacao.endereco_rua,
        endereco_numero: federacao.endereco_numero,
        endereco_bairro: federacao.endereco_bairro,
        endereco_cidade: federacao.endereco_cidade,
        endereco_estado: federacao.endereco_estado,
        endereco_cep: federacao.endereco_cep,
      },
      validade: academia.anualidade_vencimento,
      dataEmissao: new Date().toISOString(),
      numeroRegistro,
    }

    return NextResponse.json(
      {
        success: true,
        certificadoData,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error generating certificate:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao gerar certificado' },
      { status: 500 }
    )
  }
}
