import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔧 [listar.ts] GET request started')
  
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('🔍 [listar.ts] Env vars check:')
    console.log('  - URL:', url ? '✅ SET' : '❌ MISSING')
    console.log('  - Key:', key ? '✅ SET' : '❌ MISSING')

    if (!url || !key) {
      console.error('❌ [listar.ts] Missing env vars')
      return NextResponse.json(
        { error: 'Supabase credentials missing', academias: [] },
        { status: 500 }
      )
    }

    const supabase = createClient(url, key)

    // Buscar TODAS as academias com todos os campos
    console.log('📡 [listar.ts] Fetching academias from Supabase...')
    const { data: academias, error } = await supabase
      .from('academias')
      .select('*')
      .order('nome', { ascending: true })

    if (error) {
      console.error('❌ [listar.ts] Supabase error:', error)
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          academias: [],
        },
        { status: 400 }
      )
    }

    console.log(`✅ [listar.ts] Fetched ${academias?.length || 0} academias`)
    return NextResponse.json(
      { academias: academias || [], error: null },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ [listar.ts] Catch error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        academias: [],
      },
      { status: 500 }
    )
  }
}
