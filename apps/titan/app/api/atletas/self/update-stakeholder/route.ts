import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ALLOWED = [
  'nome_completo', 'nome_usuario', 'email', 'telefone', 'genero',
  'data_nascimento', 'kyu_dan_id', 'academia_id', 'federacao_id',
] as const

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const payload: Record<string, unknown> = {}

    for (const key of ALLOWED) {
      if (key in body) {
        const val = body[key]
        payload[key] = val === '' ? null : (val ?? null)
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido enviado' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('stakeholders')
      .update(payload)
      .eq('id', user.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
