import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const supabase = await createClient()
    const { hash } = await params

    if (!hash) {
      return NextResponse.json(
        { error: 'Hash de validação não fornecido' },
        { status: 400 }
      )
    }

    // Buscar certificado com dados da academia e federação
    // Nota: Esta query precisa funcionar sem autenticação (RLS)
    // Por isso vamos usar o service role client para esta operação pública
    
    const { data: certificado, error } = await supabase
      .from('certificados')
      .select(`
        id,
        numero_certificado,
        ano_validade,
        data_emissao,
        data_validade,
        status,
        observacoes,
        created_at,
        academias (
          id,
          nome,
          sigla,
          cnpj,
          logo_url,
          endereco_cidade,
          endereco_estado,
          responsavel_nome
        ),
        federacoes (
          id,
          nome,
          sigla,
          logo_url,
          endereco_cidade,
          endereco_estado
        )
      `)
      .eq('hash_validacao', hash)
      .single()

    if (error || !certificado) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Certificado não encontrado' 
        },
        { status: 404 }
      )
    }

    // Verificar se certificado está ativo
    const isAtivo = certificado.status === 'ativo'
    
    // Verificar se certificado está dentro da validade
    const dataValidade = new Date(certificado.data_validade)
    const hoje = new Date()
    const isValido = dataValidade >= hoje

    // Determinar status geral
    let statusGeral = 'inválido'
    let mensagem = ''

    if (!isAtivo) {
      statusGeral = 'cancelado'
      mensagem = 'Este certificado foi cancelado'
    } else if (!isValido) {
      statusGeral = 'expirado'
      mensagem = 'Este certificado está expirado'
    } else {
      statusGeral = 'válido'
      mensagem = 'Certificado válido e ativo'
    }

    return NextResponse.json({
      valid: isAtivo && isValido,
      status: statusGeral,
      mensagem,
      certificado: {
        numero: certificado.numero_certificado,
        ano: certificado.ano_validade,
        dataEmissao: certificado.data_emissao,
        dataValidade: certificado.data_validade,
        status: certificado.status,
        observacoes: certificado.observacoes,
        academia: certificado.academias,
        federacao: certificado.federacoes
      }
    })

  } catch (error) {
    console.error('Erro ao validar certificado:', error)
    return NextResponse.json(
      { 
        valid: false,
        error: 'Erro ao validar certificado' 
      },
      { status: 500 }
    )
  }
}
