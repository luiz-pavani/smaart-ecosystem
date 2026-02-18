import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CheckinManualRequest {
  atleta_id: string
  academia_id: string
  data?: string // YYYY-MM-DD, se vazio = hoje
  hora_entrada: string // HH:MM
  hora_saida?: string // HH:MM (opcional)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: CheckinManualRequest = await request.json()
    const { atleta_id, academia_id, data, hora_entrada, hora_saida } = body

    // Validação básica
    if (!atleta_id || !academia_id || !hora_entrada) {
      return NextResponse.json(
        {
          erro: 'atleta_id, academia_id e hora_entrada são obrigatórios',
        },
        { status: 400 }
      )
    }

    // Obter usuário autenticado para verificar permissão
    const {
      data: { user },
      error: erroAuth,
    } = await supabase.auth.getUser()

    if (erroAuth || !user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se usuário é gestor da academia
    const { data: role, error: erroRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('academia_id', academia_id)
      .in('role', ['academia_admin', 'academia_gestor'])
      .single()

    if (erroRole || !role) {
      return NextResponse.json(
        { erro: 'Sem permissão para registrar entrada' },
        { status: 403 }
      )
    }

    // Definir data (padrão: hoje)
    const dataRegistro = data || new Date().toISOString().split('T')[0]

    // Validar se atleta existe
    const { data: atleta, error: erroAtleta } = await supabase
      .from('atletas')
      .select('id, nome')
      .eq('id', atleta_id)
      .single()

    if (erroAtleta || !atleta) {
      return NextResponse.json({ erro: 'Atleta não encontrado' }, { status: 404 })
    }

    // Validar se academia existe
    const { data: academia, error: erroAcademia } = await supabase
      .from('academias')
      .select('id, nome')
      .eq('id', academia_id)
      .single()

    if (erroAcademia || !academia) {
      return NextResponse.json({ erro: 'Academia não encontrada' }, { status: 404 })
    }

    // Registrar entrada na tabela frequencia
    const { data: novaFrequencia, error: erroInsert } = await supabase
      .from('frequencia')
      .insert({
        academia_id,
        atleta_id,
        data_entrada: dataRegistro,
        hora_entrada,
        hora_saida: hora_saida || null,
        metodo_validacao: 'manual',
        dispositivo: 'portaria',
        status: 'manual',
      })
      .select()
      .single()

    if (erroInsert) {
      console.error('Erro ao registrar frequência:', erroInsert)
      return NextResponse.json(
        { erro: 'Erro ao registrar entrada' },
        { status: 500 }
      )
    }

    // Calcular duração se hora_saida foi informada
    let duracao_minutos = null
    if (hora_entrada && hora_saida) {
      const [he, me] = hora_entrada.split(':').map(Number)
      const [hs, ms] = hora_saida.split(':').map(Number)
      const totalMinutosEntrada = he * 60 + me
      const totalMinutosSaida = hs * 60 + ms
      duracao_minutos = totalMinutosSaida - totalMinutosEntrada
    }

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: `Entrada de ${atleta.nome} registrada com sucesso`,
        frequencia: {
          id: novaFrequencia.id,
          atleta_nome: atleta.nome,
          academia_nome: academia.nome,
          data: dataRegistro,
          hora_entrada,
          hora_saida: hora_saida || null,
          duracao_minutos,
          metodo: 'manual',
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { erro: 'Erro ao registrar entrada' },
      { status: 500 }
    )
  }
}
