import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {id} = await params
    
    // 1. Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // 2. Buscar dados do atleta com joins necessários
    const { data: atleta, error: atletaError } = await supabase
      .from('user_fed_lrsj')
      .select(`
        stakeholder_id,
        nome_completo,
        academias,
        validado_em,
        kyu_dan_id,
        kyu_dan:kyu_dan_id (
          id,
          kyu_dan,
          cor_faixa
        )
      `)
      .eq('stakeholder_id', id)
      .single()

    if (atletaError) {
      return NextResponse.json(
        { error: `Erro ao buscar atleta: ${atletaError.message}` },
        { status: 500 }
      )
    }

    if (!atleta) {
      return NextResponse.json(
        { error: 'Atleta não encontrado' },
        { status: 404 }
      )
    }

    // 4. Buscar logo da academia
    let academiaLogo = null
    if (atleta.academias) {
      const { data: logoData } = await supabase
        .from('academy_logos')
        .select('logo_url, logo_width, logo_height')
        .eq('academia_nome', atleta.academias.trim())
        .single()
      
      if (logoData) {
        academiaLogo = logoData
      }
    }

    // 5. Buscar template ativo de certificado
    const { data: template } = await supabase
      .from('document_templates')
      .select('*')
      .eq('template_type', 'certificado')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 6. Extrair ano da validação (ou ano atual)
    const anoValidacao = atleta.validado_em
      ? new Date(atleta.validado_em).getFullYear()
      : new Date().getFullYear()

    // 7. Formatar dados para o frontend
    const kyuDanData = Array.isArray(atleta.kyu_dan) ? atleta.kyu_dan[0] : atleta.kyu_dan
    
    const documentData = {
      atleta: {
        id: atleta.stakeholder_id,
        nome: atleta.nome_completo,
        academia: atleta.academias || '—',
        graduacao: kyuDanData?.cor_faixa || '—',
        ano: anoValidacao.toString(),
      },
      academiaLogo: academiaLogo?.logo_url || null,
      template: template || {
        background_url: '/assets/certificado-fundo.png', // Fallback
        field_config: {} // Será preenchido no client
      }
    }

    return NextResponse.json(documentData)

  } catch (error) {
    console.error('Erro ao buscar dados para certificado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
