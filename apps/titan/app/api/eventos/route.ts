import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('eventos')
    .select('id, nome, data_evento, local, descricao, status, cidade')
    .order('data_evento', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ eventos: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const allowed = ['master_access', 'federacao_admin', 'federacao_gestor']
  if (!perfil || !allowed.includes(perfil.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const { nome, data_evento, local, cidade, descricao, status, categoria, limite_inscritos, taxa_inscricao } = body

  if (!nome || !data_evento) {
    return NextResponse.json({ error: 'Nome e data são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('eventos')
    .insert({
      nome,
      data_evento,
      local: local || null,
      cidade: cidade || null,
      descricao: descricao || null,
      status: status || 'Planejamento',
      categoria: categoria || null,
      limite_inscritos: limite_inscritos ? parseInt(limite_inscritos) : null,
      taxa_inscricao: taxa_inscricao ? parseFloat(taxa_inscricao) : null,
      criado_por: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
