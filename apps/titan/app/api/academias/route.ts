import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      return NextResponse.json(
        { error: 'Supabase credentials missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(url, key)
    const body = await request.json()

    // Convert empty date strings to null for optional date fields
    if (body.anualidade_vencimento === '' || body.anualidade_vencimento === null) {
      body.anualidade_vencimento = null
    }

    console.log(`📝 Creating new academia:`, body.nome)

    const { data, error } = await supabase
      .from('academias')
      .insert([body])
      .select()

    if (error) {
      console.error('❌ Create error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log(`✅ Academia created successfully`)
    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
