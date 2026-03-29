import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { graduacao_pretendida } = body

    if (!graduacao_pretendida) {
      return NextResponse.json({ error: 'graduacao_pretendida is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('candidato_inscricoes')
      .upsert(
        {
          stakeholder_id: user.id,
          graduacao_pretendida,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stakeholder_id' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ inscricao: data })
  } catch (err) {
    console.error('Error in candidato/inscricao POST:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.status_inscricao !== undefined) updateFields.status_inscricao = body.status_inscricao
    if (body.status_pagamento !== undefined) updateFields.status_pagamento = body.status_pagamento
    if (body.progresso !== undefined) updateFields.progresso = body.progresso
    if (body.graduacao_pretendida !== undefined) updateFields.graduacao_pretendida = body.graduacao_pretendida

    const { data, error } = await supabaseAdmin
      .from('candidato_inscricoes')
      .update(updateFields)
      .eq('stakeholder_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ inscricao: data })
  } catch (err) {
    console.error('Error in candidato/inscricao PATCH:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
