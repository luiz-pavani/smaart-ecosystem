import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY

    if (!url || !key) {
      return NextResponse.json({ academias: [] })
    }

    const supabase = createClient(url, key)

    // Buscar todas as academias
    const { data: academias, error } = await supabase
      .from('academias')
      .select('id, sigla, nome')
      .order('nome', { ascending: true })

    if (error) {
      console.log('Erro ao buscar academias:', error.message)
      return NextResponse.json({ academias: [] })
    }

    return NextResponse.json({ academias: academias || [] })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ academias: [] })
  }
}
