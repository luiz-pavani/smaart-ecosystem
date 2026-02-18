import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Obter usuário autenticado
    const {
      data: { user },
      error: erroAuth,
    } = await supabase.auth.getUser()

    if (erroAuth || !user) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    // Parâmetros opcionais
    const { searchParams } = new URL(request.url)
    const academia_id = searchParams.get('academia_id')
    const dias = parseInt(searchParams.get('dias') || '30', 10)

    // Data limite (últimos N dias)
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() - dias)
    const dataLimiteStr = dataLimite.toISOString().split('T')[0]

    // Montar query base
    let query = supabase
      .from('frequencia')
      .select('*, academias(id, nome, sigla)')
      .eq('atleta_id', user.id)
      .gte('data_entrada', dataLimiteStr)
      .order('data_entrada', { ascending: false })

    // Filtrar por academia se passado
    if (academia_id) {
      query = query.eq('academia_id', academia_id)
    }

    const { data: frequencias, error: erroQuery } = await query

    if (erroQuery) {
      console.error('Erro ao buscar frequência:', erroQuery)
      return NextResponse.json(
        { erro: 'Erro ao buscar histórico' },
        { status: 500 }
      )
    }

    // Processamento dos dados para cálculos
    let totalPresencas = frequencias?.length || 0
    let presencasUltima7dias = 0
    const hoje = new Date()
    const um7diasAtras = new Date(hoje)
    um7diasAtras.setDate(um7diasAtras.getDate() - 7)

    const apresentacoes = (frequencias || [])
      .map((freq: any) => {
        const dataStr = freq.data_entrada
        if (new Date(dataStr) >= um7diasAtras) {
          presencasUltima7dias++
        }

        // Calcular duração se tem hora_saida
        let duracao_minutos = null
        if (freq.hora_entrada && freq.hora_saida) {
          const [he, me] = freq.hora_entrada.split(':').map(Number)
          const [hs, ms] = freq.hora_saida.split(':').map(Number)
          const totalMinutosEntrada = he * 60 + me
          const totalMinutosSaida = hs * 60 + ms
          duracao_minutos = totalMinutosSaida - totalMinutosEntrada
        }

        return {
          data: freq.data_entrada,
          hora_entrada: freq.hora_entrada,
          hora_saida: freq.hora_saida || null,
          duracao_minutos,
          academia: freq.academias?.nome || 'Desconhecida',
          status: freq.status,
        }
      })

    // Calcular frequência média por semana
    const frequenciaMediaSemana = (totalPresencas / Math.ceil(dias / 7)).toFixed(1)

    // Meta padrão: 16 presenças por mês (4x por semana)
    const metaPresencas = Math.ceil((dias / 30) * 16)
    const progressoPercentual = Math.round((totalPresencas / metaPresencas) * 100)

    return NextResponse.json(
      {
        total_presencas_periodo: totalPresencas,
        presencas_ultima_semana: presencasUltima7dias,
        presencas: apresentacoes,
        frequencia_media_semana: parseFloat(frequenciaMediaSemana),
        meta_presencas: metaPresencas,
        progresso_percentual: progressoPercentual,
        periodo: {
          inicio: dataLimiteStr,
          fim: hoje.toISOString().split('T')[0],
          dias_consulta: dias,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { erro: 'Erro ao buscar histórico' },
      { status: 500 }
    )
  }
}
