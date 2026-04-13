import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role, academia_id, federacao_id')
    .eq('id', user.id)
    .maybeSingle()

  // If user has a specific academia, return just that one
  if (perfil?.academia_id) {
    const { data: acad } = await supabaseAdmin
      .from('academias')
      .select('id, nome')
      .eq('id', perfil.academia_id)
      .maybeSingle()
    return NextResponse.json({ academias: acad ? [acad] : [] })
  }

  // master_access: return all academias for the federation
  if (perfil?.role === 'master_access') {
    // Try to find federation from stakeholder or use LRSJ default
    const federacaoId = perfil.federacao_id || '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d'
    const { data: academias } = await supabaseAdmin
      .from('academias')
      .select('id, nome')
      .eq('federacao_id', federacaoId)
      .order('nome')
    return NextResponse.json({ academias: academias || [] })
  }

  return NextResponse.json({ academias: [] })
}
