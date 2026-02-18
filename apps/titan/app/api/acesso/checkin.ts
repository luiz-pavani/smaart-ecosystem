// app/api/acesso/checkin.ts - SPRINT 1B
// Validar QR Code e registrar entrada
// COPIE E COLE TUDO ISTO:

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CheckinSchema } from '@/lib/schemas/acesso'
import { qrValidator } from '@/lib/acesso/qr-validation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function POST(req: NextRequest) {
  try {
    // Check supabase is initialized
    if (!supabase) {
      return NextResponse.json(
        { erro: 'Supabase não configurado' },
        { status: 500 }
      )
    }

    // 1. Validar request
    const body = await req.json()
    const validacao = CheckinSchema.safeParse(body)

    if (!validacao.success) {
      return NextResponse.json(
        { erro: 'Dados inválidos', detalhes: validacao.error.flatten() },
        { status: 400 }
      )
    }

    const { qr_token, academia_id, dispositivo } = validacao.data

    // 2. Validar QR token (JWT)
    const { valido, payload, erro: erroValidacao } = qrValidator.validarToken(qr_token)

    if (!valido || !payload) {
      return NextResponse.json(
        { status: 'negado', mensagem: erroValidacao || 'QR inválido' },
        { status: 403 }
      )
    }

    // 3. Verificar se token pertence à academia correta
    if (payload.academia_id !== academia_id) {
      return NextResponse.json(
        { status: 'negado', mensagem: 'QR não pertence a esta academia' },
        { status: 403 }
      )
    }

    const { atleta_id } = payload

    // 4. Verificar plano do atleta
    const { data: atleta, error: erroAtleta } = await supabase
      .from('atletas')
      .select('id, nome_completo, status')
      .eq('id', atleta_id)
      .single()

    if (erroAtleta || !atleta) {
      return NextResponse.json(
        { status: 'negado', mensagem: 'Atleta não encontrado' },
        { status: 404 }
      )
    }

    // 5. Verificar se academia tem plano ativo
    const { data: academia, error: erroAcademia } = await supabase
      .from('academias')
      .select('plan_status')
      .eq('id', academia_id)
      .single()

    if (erroAcademia || academia?.plan_status !== 'active') {
      return NextResponse.json(
        { status: 'negado', mensagem: 'Academia sem plano ativo' },
        { status: 403 }
      )
    }

    // 6. Verificar se já entrou hoje
    const hoje = new Date().toISOString().split('T')[0]
    const { data: entradaHoje, error: erroCheck } = await supabase
      .from('frequencia')
      .select('id')
      .eq('atleta_id', atleta_id)
      .eq('academia_id', academia_id)
      .eq('data_entrada', hoje)
      .single()

    if (!erroCheck && entradaHoje) {
      // Já entrou hoje
      return NextResponse.json(
        {
          status: 'autorizado',
          mensagem: 'Bem-vindo de volta!',
          atleta_nome: atleta.nome_completo,
          nota: 'Você já estava registrado hoje',
        },
        { status: 200 }
      )
    }

    // 7. Registrar entrada
    const agora = new Date()
    const hora = agora.toTimeString().split(' ')[0] // HH:MM:SS

    const { data: entrada, error: erroInsert } = await supabase
      .from('frequencia')
      .insert({
        academia_id,
        atleta_id,
        data_entrada: hoje,
        hora_entrada: hora,
        metodo_validacao: 'qr',
        dispositivo,
        status: 'autorizado',
      })
      .select()
      .single()

    if (erroInsert) {
      console.error('Erro ao registrar entrada:', erroInsert)
      return NextResponse.json(
        { status: 'negado', mensagem: 'Erro ao registrar entrada' },
        { status: 500 }
      )
    }

    // 8. Marcar sessão QR como usada
    await supabase
      .from('sessoes_qr')
      .update({
        usado: true,
        data_uso: agora.toISOString(),
        academia_uso: academia_id,
      })
      .eq('qr_token', qr_token)

    // 9. Log de acesso bem-sucedido
    console.log(`[Checkin] Atleta ${atleta_id} entrou em ${academia_id} às ${hora}`)

    // 10. Responder com sucesso
    return NextResponse.json(
      {
        status: 'autorizado',
        mensagem: 'Bem-vindo!',
        atleta_nome: atleta.nome_completo,
        hora_entrada: hora,
        academia_id,
      },
      { status: 200 }
    )
  } catch (erro) {
    console.error('Erro ao processar check-in:', erro)
    return NextResponse.json(
      { status: 'negado', mensagem: 'Erro ao processar check-in' },
      { status: 500 }
    )
  }
}

