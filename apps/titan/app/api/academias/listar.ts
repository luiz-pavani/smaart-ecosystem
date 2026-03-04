import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      console.error('Missing Supabase URL or Service Key')
      return NextResponse.json({ error: 'Supabase not configured', academias: [] }, { status: 500 })
    }

    const supabase = createClient(url, key)

    // Buscar TODAS as academias com todos os campos
    console.log('Fetching academias from Supabase...')
    const { data: academias, error } = await supabase
      .from('academias')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error('❌ Erro ao buscar academias:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        academias: [] 
      }, { status: 400 })
    }

    console.log(`✅ Fetched ${academias?.length || 0} academias`)
    return NextResponse.json({ academias: academias || [] }, { status: 200 })
  } catch (error) {
    console.error('❌ Catch error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      academias: [] 
    }, { status: 500 })
  }
}
