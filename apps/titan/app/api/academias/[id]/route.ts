import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
