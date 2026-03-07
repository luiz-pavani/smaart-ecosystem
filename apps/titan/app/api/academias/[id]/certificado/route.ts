import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { CertificadoFiliacao } from '@/components/certificates/CertificadoFiliacao'
import React from 'react'

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
      console.error('❌ Academia not found:', academiaError)
      return NextResponse.json(
        { error: 'Academia não encontrada' },
        { status: 404 }
      )
    }

    // Buscar federação separadamente
    const { data: federacao, error: federacaoError } = await supabase
      .from('federacoes')
      .select('nome_completo, sigla, cnpj')
      .eq('id', academia.federacao_id)
      .single()

    if (federacaoError || !federacao) {
      console.error('❌ Federação not found:', federacaoError)
      return NextResponse.json(
        { error: 'Federação não encontrada para esta academia' },
        { status: 404 }
      )
    }

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
        nome_completo: federacao.nome_completo,
        sigla: federacao.sigla,
        cnpj: federacao.cnpj,
      },
      dataEmissao: new Date().toISOString(),
      numeroRegistro,
    }

    console.log('📄 Gerando certificado para:', academia.nome)

    // Gerar PDF - usando type assertion para resolver incompatibilidade de tipos
    const stream = await renderToStream(
      React.createElement(CertificadoFiliacao, certificadoData) as any
    )

    // Converter stream para buffer usando Readable
    const chunks: Buffer[] = []
    
    // Cast para any para compatibilidade com tipos
    const nodeStream = stream as any
    
    return new Promise<NextResponse>((resolve, reject) => {
      nodeStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })
      
      nodeStream.on('end', () => {
        const buffer = Buffer.concat(chunks)
        const fileName = `Certificado_Filiacao_${academia.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

        resolve(new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Cache-Control': 'no-cache',
          },
        }))
      })
      
      nodeStream.on('error', (error: Error) => {
        reject(error)
      })
    })
  } catch (error) {
    console.error('❌ Error generating certificate:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao gerar certificado' },
      { status: 500 }
    )
  }
}
