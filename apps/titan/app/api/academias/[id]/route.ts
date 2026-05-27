import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_ROLES = new Set(['master_access', 'admin', 'master'])
const FEDERATION_ROLES = new Set(['federacao_admin', 'federacao_staff'])

/** Carrega o perfil do caller e devolve {role, federacao_id} ou null se anônimo. */
async function getCallerProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: stake } = await supabaseAdmin
    .from('stakeholders')
    .select('role, federacao_id, academia_id')
    .eq('id', user.id)
    .maybeSingle()
  return { user, ...stake }
}

/**
 * GET — qualquer usuário autenticado pode ver dados básicos. Apenas admins
 * (master_access ou federacao_admin/staff da mesma federação) recebem PII
 * completa (CPF/RG/CNPJ/IE/IM, contatos do responsável, credenciais
 * Safe2Pay).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const profile = await getCallerProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('academias')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  const role = profile.role ?? ''
  const isMaster = ADMIN_ROLES.has(role)
  const isFedAdmin = FEDERATION_ROLES.has(role) && profile.federacao_id === data.federacao_id
  const isAcademiaAdmin = profile.academia_id === id

  if (!isMaster && !isFedAdmin && !isAcademiaAdmin) {
    // Não-admin: devolver só campos públicos (esconde PII, credenciais, etc.)
    const safe = {
      id: data.id,
      federacao_id: data.federacao_id,
      nome: data.nome,
      nome_fantasia: data.nome_fantasia,
      sigla: data.sigla,
      logo_url: data.logo_url,
      endereco_cidade: data.endereco_cidade,
      endereco_estado: data.endereco_estado,
      ativo: data.ativo,
    }
    return NextResponse.json({ academia: safe })
  }

  return NextResponse.json({ academia: data })
}

/**
 * PUT — apenas master_access ou federacao_admin/staff da mesma federação
 * podem editar. Campos sensíveis (safe2pay_*, anualidade_*, etc.) são
 * sempre permitidos para esses perfis.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const profile = await getCallerProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Carrega a academia primeiro para checar federacao_id
  const { data: current } = await supabaseAdmin
    .from('academias')
    .select('federacao_id')
    .eq('id', id)
    .maybeSingle()
  if (!current) {
    return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })
  }

  const role = profile.role ?? ''
  const isMaster = ADMIN_ROLES.has(role)
  const isFedAdmin = FEDERATION_ROLES.has(role) && profile.federacao_id === current.federacao_id

  if (!isMaster && !isFedAdmin) {
    return NextResponse.json(
      { error: 'Sem permissão para editar esta academia' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    if (body.anualidade_vencimento === '' || body.anualidade_vencimento === null) {
      body.anualidade_vencimento = null
    }

    const { data, error } = await supabaseAdmin
      .from('academias')
      .update(body)
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
