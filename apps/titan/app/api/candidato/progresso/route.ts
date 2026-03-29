import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { progresso } = body

    if (progresso === undefined) {
      return NextResponse.json({ error: 'progresso is required' }, { status: 400 })
    }

    // Upsert — ensure inscription exists
    const { data: existing } = await supabaseAdmin
      .from('candidato_inscricoes')
      .select('id')
      .eq('stakeholder_id', user.id)
      .maybeSingle()

    if (!existing) {
      // Create with defaults first
      await supabaseAdmin
        .from('candidato_inscricoes')
        .insert({
          stakeholder_id: user.id,
          progresso,
        })
      return NextResponse.json({ ok: true })
    }

    const { data, error } = await supabaseAdmin
      .from('candidato_inscricoes')
      .update({
        progresso,
        updated_at: new Date().toISOString(),
      })
      .eq('stakeholder_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ inscricao: data })
  } catch (err) {
    console.error('Error in candidato/progresso PATCH:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
