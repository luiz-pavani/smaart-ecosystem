import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('candidato_documentos')
      .select('*')
      .eq('stakeholder_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ documentos: data || [] })
  } catch (err) {
    console.error('Error in candidato/documentos GET:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { file_url, file_name, category } = body

    if (!file_url || !file_name || !category) {
      return NextResponse.json({ error: 'file_url, file_name, and category are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('candidato_documentos')
      .insert({
        stakeholder_id: user.id,
        file_url,
        file_name,
        category,
        status: 'Pendente',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ documento: data })
  } catch (err) {
    console.error('Error in candidato/documentos POST:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
