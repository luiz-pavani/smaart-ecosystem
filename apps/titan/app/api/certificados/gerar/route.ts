import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // 1. Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // 2. Buscar role do usuário
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, federacao_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData || roleData.role !== 'federacao_admin') {
      return NextResponse.json(
        { error: 'Sem permissão para gerar certificados' },
        { status: 403 }
      )
    }

    // 3. Validar request body
    const body = await request.json()
    const { academia_id } = body

    if (!academia_id) {
      return NextResponse.json(
        { error: 'academia_id é obrigatório' },
        { status: 400 }
      )
    }

    // 4. Buscar dados da academia com join na federação
    const { data: academia, error: academiaError } = await supabase
      .from('academias')
      .select(`
        id,
        nome,
        sigla,
        cnpj,
        anualidade_status,
        certificado_2026_id,
        federacao_id,
        federacoes (
          id,
          nome,
          sigla,
          logo_url
        )
      `)
      .eq('id', academia_id)
      .eq('federacao_id', roleData.federacao_id)
      .single()

    if (academiaError || !academia) {
      return NextResponse.json(
        { error: 'Academia não encontrada' },
        { status: 404 }
      )
    }

    // 5. Verificar se anualidade está paga
    if (academia.anualidade_status !== 'paga') {
      return NextResponse.json(
        { error: 'A anuidade da academia deve estar paga para gerar certificado' },
        { status: 400 }
      )
    }

    // 6. Verificar se já existe certificado válido para 2026
    if (academia.certificado_2026_id) {
      const { data: certificadoExistente } = await supabase
        .from('certificados')
        .select('*')
        .eq('id', academia.certificado_2026_id)
        .eq('status', 'ativo')
        .single()

      if (certificadoExistente) {
        return NextResponse.json(
          { 
            error: 'Certificado já emitido para esta academia em 2026',
            certificado: certificadoExistente
          },
          { status: 400 }
        )
      }
    }

    // 7. Gerar hash de validação único
    const timestamp = Date.now()
    const randomData = Math.random().toString(36).substring(2, 15)
    const hashValidacao = createHash('sha256')
      .update(`${academia_id}-${timestamp}-${randomData}`)
      .digest('hex')

    // 8. Gerar número do certificado usando função SQL
    const anoValidade = 2026
    const federacao = academia.federacoes as any
    
    const { data: numeroCertificado, error: numeroError } = await supabase
      .rpc('gerar_numero_certificado', {
        p_federacao_id: roleData.federacao_id,
        p_sigla_federacao: federacao.sigla,
        p_ano: anoValidade
      })

    if (numeroError || !numeroCertificado) {
      console.error('Erro ao gerar número:', numeroError)
      return NextResponse.json(
        { error: 'Erro ao gerar número do certificado' },
        { status: 500 }
      )
    }

    // 9. Data de validade: 31/12/2026
    const dataValidade = new Date(2026, 11, 31) // Mês 11 = Dezembro

    // 10. Inserir certificado
    const { data: certificado, error: certificadoError } = await supabase
      .from('certificados')
      .insert({
        federacao_id: roleData.federacao_id,
        academia_id: academia_id,
        numero_certificado: numeroCertificado,
        ano_validade: anoValidade,
        data_emissao: new Date().toISOString().split('T')[0],
        data_validade: dataValidade.toISOString().split('T')[0],
        hash_validacao: hashValidacao,
        status: 'ativo',
        emitido_por_user_id: user.id
      })
      .select()
      .single()

    if (certificadoError || !certificado) {
      console.error('Erro ao criar certificado:', certificadoError)
      return NextResponse.json(
        { error: 'Erro ao criar certificado' },
        { status: 500 }
      )
    }

    // 11. Atualizar academia com certificado_2026_id
    const { error: updateError } = await supabase
      .from('academias')
      .update({ certificado_2026_id: certificado.id })
      .eq('id', academia_id)

    if (updateError) {
      console.error('Erro ao atualizar academia:', updateError)
    }

    // 12. Retornar certificado com dados completos
    return NextResponse.json({
      success: true,
      certificado: {
        ...certificado,
        academia: {
          nome: academia.nome,
          sigla: academia.sigla,
          cnpj: academia.cnpj
        },
        federacao: {
          nome: federacao.nome,
          sigla: federacao.sigla,
          logo_url: federacao.logo_url
        },
        url_validacao: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/validar-certificado/${hashValidacao}`
      }
    })

  } catch (error) {
    console.error('Erro ao gerar certificado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
