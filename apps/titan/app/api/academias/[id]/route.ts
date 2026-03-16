import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })

  const supabase = createClient(url, key)
  const { data, error } = await supabase.from('academias').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })
  return NextResponse.json({ academia: data })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
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

    console.log(`📝 Updating academia ${id}:`, body)

    const { data, error } = await supabase
      .from('academias')
      .update(body)
      .eq('id', id)
      .select()

    if (error) {
      console.error('❌ Update error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log(`✅ Academia ${id} updated successfully`)
    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
