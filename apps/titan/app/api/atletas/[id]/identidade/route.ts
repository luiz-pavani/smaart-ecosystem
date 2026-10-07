import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { anexarKyuDan } from '@/lib/filiacao/lrsj'
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
    const { data: atletaRow, error: atletaError } = await supabase
      .from('user_fed_lrsj')
      .select(`
        stakeholder_id,
        nome_completo,
        academia_id,
        data_nascimento,
        data_expiracao,
        nivel_arbitragem,
        kyu_dan_id
      `)
      .eq('stakeholder_id', id)
      .single()

    if (atletaError) {
      return NextResponse.json(
        { error: `Erro ao buscar atleta: ${atletaError.message}` },
        { status: 500 }
      )
    }

    // kyu_dan buscado à parte: o cast ::bigint da view esconde a FK do PostgREST
    const [atleta] = atletaRow ? await anexarKyuDan(supabaseAdmin, [atletaRow]) : []
    if (!atleta) {
      return NextResponse.json(
        { error: 'Atleta não encontrado' },
        { status: 404 }
      )
    }

    // 4. Buscar logo da academia via academia_id → academias → academy_logos
    let academiaLogo = null
    let academiaNome: string | null = null
    {
      const namesToTry: string[] = []

      // Resolve nome/sigla via academia_id (mais confiável) — usa admin para bypassar RLS
      if (atleta.academia_id) {
        const { data: academiaData } = await supabaseAdmin
          .from('academias')
          .select('nome, sigla')
          .eq('id', atleta.academia_id)
          .single()
        academiaNome = academiaData?.nome ?? null
        if (academiaData?.nome) namesToTry.push(academiaData.nome)
        if (academiaData?.sigla) namesToTry.push(academiaData.sigla)
      }

      for (const name of namesToTry) {
        const { data: logoData } = await supabaseAdmin
          .from('academy_logos')
          .select('logo_url, logo_width, logo_height')
          .eq('academia_nome', name)
          .single()
        if (logoData) { academiaLogo = logoData; break }
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
    const kyuDanData = atleta.kyu_dan
    // Graduação combina cor_faixa e kyu_dan (ex.: "Preta | 1º dan"), igual ao
    // card "Graduação e Arbitragem" do portal do atleta.
    const graduacaoLabel = (() => {
      const cor = kyuDanData?.cor_faixa?.trim()
      const grau = kyuDanData?.kyu_dan?.trim()
      if (cor && grau) return `${cor} | ${grau}`
      return cor || grau || '—'
    })()

    const documentData = {
      atleta: {
        id: atleta.stakeholder_id,
        nome: atleta.nome_completo,
        academia: academiaNome || '—',
        dataNascimento: atleta.data_nascimento ?
          new Date(atleta.data_nascimento).toLocaleDateString('pt-BR') : '—',
        graduacao: graduacaoLabel,
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
