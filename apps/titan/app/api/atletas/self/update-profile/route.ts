import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()

    // Only allow safe self-editable fields — never kyu_dan_id, data_nascimento, status_*, etc.
    const ALLOWED = [
      'nome_completo', 'nome_patch', 'genero', 'nacionalidade',
      'email', 'telefone', 'cidade', 'estado', 'pais', 'tamanho_patch',
    ] as const

    const payload: Record<string, unknown> = {}
    for (const key of ALLOWED) {
      if (key in body) payload[key] = body[key] || null
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido enviado' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('user_fed_lrsj')
      .update(payload)
      .eq('stakeholder_id', user.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
