import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const academia_id = searchParams.get('academia_id')

    if (!academia_id) {
      return Response.json(
        { erro: 'Parâmetro academia_id é obrigatório' },
        { status: 400 }
      )
    }

    const { data: atletas, error } = await supabase
      .from('atletas')
      .select('id, nome, cpf')
      .eq('academia_id', academia_id)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro na query:', error)
      return Response.json(
        { erro: 'Erro ao buscar atletas' },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      atletas: atletas || []
    })

  } catch (error) {
    console.error('Erro:', error)
    return Response.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}