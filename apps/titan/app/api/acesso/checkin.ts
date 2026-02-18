import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CheckinRequest {
  qr_token: string
  academia_id: string
  dispositivo?: 'smartphone' | 'catraca' | 'web'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: CheckinRequest = await request.json()
    const { qr_token, academia_id, dispositivo = 'web' } = body

    // Validação básica
    if (!qr_token || !academia_id) {
      return NextResponse.json(
        {
          status: 'negado',
          motivo: 'parametros_incompletos',
          mensagem: 'qr_token e academia_id são obrigatórios',
        },
        { status: 400 }
      )
    }

    // 1. Validar QR token
    const { data: sessao, error: erroSessao } = await supabase
      .from('sessoes_qr')
      .select('*, atletas(id, nome, plan_status)')
      .eq('qr_token', qr_token)
      .single()

    if (erroSessao || !sessao) {
      return NextResponse.json(
        {
          status: 'negado',
          motivo: 'qr_invalido',
          mensagem: 'Código QR inválido',
        },
        { status: 403 }
      )
    }

    // 2. Verificar se QR expirou
    if (new Date(sessao.data_expiracao) < new Date()) {
      return NextResponse.json(
        {
          status: 'negado',
          motivo: 'qr_expirado',
          mensagem: 'Código QR expirado',
          sugestao: 'Gere um novo código QR',
        },
        { status: 403 }
      )
    }

    // 3. Verificar se QR já foi usado
    if (sessao.usado) {
      return NextResponse.json(
        {
          status: 'negado',
          motivo: 'qr_ja_utilizado',
          mensagem: 'Código QR já foi utilizado',
        },
        { status: 409 }
      )
    }

    // 4. Verificar se atleta tem plano ativo
    const atleta = sessao.atletas
    if (atleta.plan_status !== 'active') {
      return NextResponse.json(
        {
          status: 'negado',
          motivo: 'plano_inativo',
          mensagem: 'Seu plano está inativo',
          sugestao: 'Ative seu plano para continuar',
        },
        { status: 403 }
      )
    }

    // 5. Verificar se já fez check-in hoje
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const amanha = new Date(hoje)
    amanha.setDate(amanha.getDate() + 1)

    const { data: frequenciaHoje } = await supabase
      .from('frequencia')
      .select('id')
      .eq('atleta_id', sessao.atleta_id)
      .eq('academia_id', academia_id)
      .gte('created_at', hoje.toISOString())
      .lt('created_at', amanha.toISOString())
      .limit(1)

    if (frequenciaHoje && frequenciaHoje.length > 0) {
      return NextResponse.json(
        {
          status: 'negado',
          motivo: 'checkin_duplicado',
          mensagem: 'Você já fez check-in hoje',
        },
        { status: 409 }
      )
    }

    // 6. Registrar entrada na tabela frequencia
    const agora = new Date()
    const data = agora.toISOString().split('T')[0]
    const hora = agora.toTimeString().substring(0, 5)
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-client-ip') || 
                     'unknown'

    const { data: novaFrequencia, error: erroFrequencia } = await supabase
      .from('frequencia')
      .insert({
        academia_id,
        atleta_id: sessao.atleta_id,
        data_entrada: data,
        hora_entrada: hora,
        metodo_validacao: 'qr',
        dispositivo,
        ip_origem: clientIP,
        status: 'autorizado',
      })
      .select()
      .single()

    if (erroFrequencia) {
      console.error('Erro ao registrar frequência:', erroFrequencia)
      return NextResponse.json(
        { erro: 'Erro ao registrar entrada' },
        { status: 500 }
      )
    }

    // 7. Atualizar sessão QR (marcar como usada)
    const { error: erroUpdate } = await supabase
      .from('sessoes_qr')
      .update({
        usado: true,
        data_uso: agora.toISOString(),
        academia_uso: academia_id,
      })
      .eq('id', sessao.id)

    if (erroUpdate) {
      console.error('Erro ao atualizar sessão QR:', erroUpdate)
    }

    // 8. Contar frequência do mês
    const { count: frequenciaMes } = await supabase
      .from('frequencia')
      .select('*', { count: 'exact', head: true })
      .eq('atleta_id', sessao.atleta_id)
      .eq('academia_id', academia_id)
      .gte('data_entrada', new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0])

    // Resposta de sucesso
    return NextResponse.json(
      {
        status: 'aprovado',
        mensagem: `Bem-vindo ${atleta.nome}!`,
        atleta_nome: atleta.nome,
        frequencia_este_mes: frequenciaMes || 0,
        hora_entrada: agora,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { erro: 'Erro ao fazer check-in' },
      { status: 500 }
    )
  }
}
