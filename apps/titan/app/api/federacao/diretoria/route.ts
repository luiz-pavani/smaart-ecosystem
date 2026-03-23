import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ROLE_LABELS: Record<string, string> = {
  master_access:     'Administrador Master',
  federacao_admin:   'Administrador da Federação',
  federacao_gestor:  'Gestor da Federação',
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('stakeholders')
    .select('id, nome_completo, email, telefone, role, url_foto')
    .in('role', ['master_access', 'federacao_admin', 'federacao_gestor'])
    .order('role')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const diretoria = (data || []).map((s: any) => ({
    id: s.id,
    nome: s.nome_completo || 'Sem nome',
    cargo: ROLE_LABELS[s.role] || s.role,
    email: s.email,
    telefone: s.telefone,
    url_foto: s.url_foto,
    role: s.role,
  }))

  return NextResponse.json({ diretoria })
}
