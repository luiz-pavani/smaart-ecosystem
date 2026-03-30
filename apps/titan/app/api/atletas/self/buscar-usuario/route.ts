import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'master_access') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ usuarios: [] })

  const { data } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, email, role')
    .or(`nome_completo.ilike.%${q}%,email.ilike.%${q}%`)
    .order('nome_completo', { ascending: true })
    .limit(10)

  return NextResponse.json({ usuarios: data || [] })
}
