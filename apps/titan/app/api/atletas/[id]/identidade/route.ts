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
        id,
        user_id,
        nome_completo,
        academias,
        data_nascimento,
        data_expiracao,
        nivel_arbitragem,
        kyu_dan_id,
        kyu_dan:kyu_dan_id (
          id,
          kyu_dan,
          cor_faixa,
          icones
        )
      `)
      .eq('id', id)
      .single()

    if (atletaError || !atleta) {
      return NextResponse.json(
        { error: 'Atleta não encontrado' },
        { status: 404 }
      )
    }

    // 3. Verificar permissões
    // Atleta pode gerar seu próprio documento
    const isOwnDocument = atleta.user_id === user.id
    
    // Ou admin pode gerar
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    const isAdmin = roleData?.role && ['master_access', 'federacao_admin', 'academia_admin'].includes(roleData.role)
    
    if (!isOwnDocument && !isAdmin) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar dados deste atleta' },
        { status: 403 }
      )
    }

    // 4. Buscar logo da academia (se houver mapeamento)
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

    // 5. Buscar template ativo de identidade
    const { data: template } = await supabase
      .from('document_templates')
      .select('*')
      .eq('template_type', 'identidade')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 6. Formatar dados para o frontend
    const kyuDanData = Array.isArray(atleta.kyu_dan) ? atleta.kyu_dan[0] : atleta.kyu_dan
    
    const documentData = {
      atleta: {
        id: atleta.id,
        nome: atleta.nome_completo,
        academia: atleta.academias || '—',
        dataNascimento: atleta.data_nascimento ? 
          new Date(atleta.data_nascimento).toLocaleDateString('pt-BR') : '—',
        graduacao: kyuDanData?.cor_faixa || '—',
        nivelArbitragem: atleta.nivel_arbitragem || '—',
        validade: atleta.data_expiracao ? 
          new Date(atleta.data_expiracao).toLocaleDateString('pt-BR') : '—',
      },
      academiaLogo: academiaLogo?.logo_url || null,
      template: template || {
        background_url: '/assets/identidade-fundo.png', // Fallback
        field_config: {} // Será preenchido com defaults no client
      }
    }

    return NextResponse.json(documentData)

  } catch (error) {
    console.error('Erro ao buscar dados para identidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
