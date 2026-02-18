// app/api/acesso/gerar-qr.ts - SPRINT 1B
// Gerar QR Code para aluno
// COPIE E COLE TUDO ISTO:

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { qrValidator } from '@/lib/acesso/qr-validation'
import QRCode from 'qrcode'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function GET(req: NextRequest) {
  try {
    // Check supabase is initialized
    if (!supabase) {
      return NextResponse.json(
        { erro: 'Supabase não configurado' },
        { status: 500 }
      )
    }

    // 1. Verificar autenticação
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { erro: 'Autenticação necessária' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. Obter usuário do token (aqui você validaria com Supabase)
    // Por agora, assumir que usuário está autenticado
    const { data: { user }, error: erroAuth } = await supabase.auth.getUser(token)

    if (erroAuth || !user) {
      return NextResponse.json(
        { erro: 'Token inválido' },
        { status: 401 }
      )
    }

    // 3. Buscar atleta
    const { data: atleta, error: erroAtleta } = await supabase
      .from('atletas')
      .select('id, academia_id, nome_completo')
      .eq('user_id', user.id)
      .single()

    if (erroAtleta || !atleta) {
      return NextResponse.json(
        { erro: 'Atleta não encontrado' },
        { status: 404 }
      )
    }

    // 4. Verificar se plano está ativo
    const { data: academia, error: erroAcademia } = await supabase
      .from('academias')
      .select('plan_status')
      .eq('id', atleta.academia_id)
      .single()

    if (academia?.plan_status !== 'active') {
      return NextResponse.json(
        { erro: 'Plano inativo. Complete o pagamento para continuar.' },
        { status: 403 }
      )
    }

    // 5. Gerar token JWT para QR
    const qr_token = qrValidator.gerarToken(atleta.id, atleta.academia_id, 24)

    // 6. Gerar imagem QR
    const qr_data = {
      token: qr_token,
      atleta: atleta.nome_completo,
      academia_id: atleta.academia_id,
      validade_ate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    const qr_json = JSON.stringify(qr_data)
    const qr_image = await QRCode.toDataURL(qr_json, {
      width: 300,
      margin: 10,
      color: { dark: '#000000', light: '#FFFFFF' },
    })

    // 7. Salvar sessão QR no banco
    const { data: sessao, error: erroSessao } = await supabase
      .from('sessoes_qr')
      .insert({
        atleta_id: atleta.id,
        qr_token,
        qr_image_url: qr_image,
        data_expiracao: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ip_criacao: (req.headers.get('x-forwarded-for') || 'unknown') as any,
        user_agent: req.headers.get('user-agent'),
      })
      .select()
      .single()

    if (erroSessao) {
      console.error('Erro ao salvar sessão QR:', erroSessao)
    }

    // 8. Responder
    return NextResponse.json(
      {
        success: true,
        qr_token,
        qr_image: qr_image,
        validade_ate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        instrucoes: 'Apresente este QR Code no acesso da academia',
      },
      { status: 200 }
    )
  } catch (erro) {
    console.error('Erro ao gerar QR:', erro)
    return NextResponse.json(
      { erro: 'Erro ao gerar QR Code' },
      { status: 500 }
    )
  }
}

