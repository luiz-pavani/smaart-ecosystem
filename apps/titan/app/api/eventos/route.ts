import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['master_access', 'federacao_admin', 'federacao_gestor']

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const url = req.nextUrl
  const status = url.searchParams.get('status')
  const publicado = url.searchParams.get('publicado')
  const upcoming = url.searchParams.get('upcoming')
  const federacao_id = url.searchParams.get('federacao_id')
  const tipo_evento = url.searchParams.get('tipo_evento')
  const limit = parseInt(url.searchParams.get('limit') || '50')

  let query = supabaseAdmin
    .from('eventos')
    .select('id, nome, data_evento, data_evento_fim, hora_inicio, local, cidade, descricao, status, tipo_evento, modalidade, banner_url, publicado, inscricao_inicio, inscricao_fim, valor_inscricao, limite_inscritos, num_areas, federacao_id, criado_por, created_at')
    .order('data_evento', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  if (publicado === 'true') {
    query = query.eq('publicado', true)
  }

  if (upcoming === 'true') {
    query = query.gte('data_evento', new Date().toISOString().split('T')[0])
    query = query.order('data_evento', { ascending: true })
  }

  if (federacao_id) {
    query = query.eq('federacao_id', federacao_id)
  }

  if (tipo_evento) {
    query = query.eq('tipo_evento', tipo_evento)
  }

  // Se não é admin, filtra apenas publicados ou criados pelo user
  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = perfil && ADMIN_ROLES.includes(perfil.role)

  if (!isAdmin && publicado !== 'true') {
    // Non-admin sem filtro de publicado: mostra publicados + próprios
    query = query.or(`publicado.eq.true,criado_por.eq.${user.id}`)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ eventos: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabaseAdmin
    .from('stakeholders')
    .select('role, federacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil || !ADMIN_ROLES.includes(perfil.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const { nome, data_evento } = body

  if (!nome || !data_evento) {
    return NextResponse.json({ error: 'Nome e data são obrigatórios' }, { status: 400 })
  }

  const insert: Record<string, unknown> = {
    nome,
    data_evento,
    criado_por: user.id,
    status: body.status || 'Planejamento',
    publicado: body.publicado ?? false,
    federacao_id: body.federacao_id || perfil.federacao_id || null,
    // Campos opcionais
    data_evento_fim: body.data_evento_fim || null,
    hora_inicio: body.hora_inicio || null,
    hora_fim: body.hora_fim || null,
    local: body.local || null,
    cidade: body.cidade || null,
    descricao: body.descricao || null,
    categoria: body.categoria || null,
    limite_inscritos: body.limite_inscritos ? parseInt(body.limite_inscritos) : null,
    taxa_inscricao: body.taxa_inscricao ? parseFloat(body.taxa_inscricao) : null,
    valor_inscricao: body.valor_inscricao ? parseFloat(body.valor_inscricao) : 0,
    modalidade: body.modalidade || 'Judo',
    tipo_evento: body.tipo_evento || 'Campeonato',
    regulamento: body.regulamento || null,
    banner_url: body.banner_url || null,
    inscricao_inicio: body.inscricao_inicio || null,
    inscricao_fim: body.inscricao_fim || null,
    num_areas: body.num_areas ? parseInt(body.num_areas) : 1,
    endereco_completo: body.endereco_completo || null,
    contato_email: body.contato_email || null,
    contato_telefone: body.contato_telefone || null,
    config: body.config || {},
  }

  const { data, error } = await supabaseAdmin
    .from('eventos')
    .insert(insert)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
