import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ROLE_HIERARCHY: Record<string, number> = {
  master_access: 1,
  federacao_admin: 2,
  federacao_gestor: 3,
  federacao_secretario: 3,
  federacao_financeiro: 3,
  federacao_staff: 3,
  academia_admin: 4,
  academia_gestor: 5,
  academia_secretario: 5,
  academia_staff: 5,
  professor: 6,
  atleta: 7,
}

const getNivelHierarquico = (role: string | null | undefined) => {
  if (!role) return null
  return ROLE_HIERARCHY[role] ?? null
}

export async function GET(request: NextRequest) {
  try {
    console.log('[PERMISSOES] Starting GET request')
    const supabase = await createClient()
    console.log('[PERMISSOES] Supabase client created')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    console.log('[PERMISSOES] User check:', user ? user.email : 'NO USER')

    if (!user) {
      console.log('[PERMISSOES] Returning 401 - no user')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Get user's role information
    console.log('[PERMISSOES] Fetching user role for:', user.id)
    const { data: perfilArray, error: perfilError } = await supabase
      .from('user_roles')
      .select('role, federacao_id, academia_id')
      .eq('user_id', user.id)
      .limit(1)

    console.log('[PERMISSOES] Role query result:', {
      hasData: !!perfilArray,
      hasError: !!perfilError,
      error: perfilError?.message,
      dataLength: perfilArray?.length,
      data: perfilArray?.[0],
    })

    if (perfilError) {
      console.error('[PERMISSOES] Error fetching user role:', perfilError)
      return NextResponse.json(
        { error: 'Perfil não encontrado', details: perfilError.message },
        { status: 403 }
      )
    }

    // If no role found, user has no permissions
    if (!perfilArray || perfilArray.length === 0) {
      console.log('[PERMISSOES] User has no role', { userId: user.id })
      return NextResponse.json(
        { error: 'Perfil não encontrado', userId: user.id },
        { status: 403 }
      )
    }

    const perfil = perfilArray[0]
    const perfilNivel = getNivelHierarquico(perfil.role)
    if (!perfilNivel) {
      return NextResponse.json(
        { error: 'Perfil sem nível de acesso válido' },
        { status: 403 }
      )
    }

    // Define role hierarchy information
    const rolesInfo = [
      {
        role: 'master_access',
        nome: 'Master Access',
        descricao: 'Acesso total ao sistema',
        nivel_hierarquico: 1,
        acesso_financeiro: true,
      },
      {
        role: 'federacao_admin',
        nome: 'Admin Federação',
        descricao: 'Administrador de federação',
        nivel_hierarquico: 2,
        acesso_financeiro: true,
      },
      {
        role: 'federacao_gestor',
        nome: 'Gestor Federação',
        descricao: 'Gestor de federação',
        nivel_hierarquico: 3,
        acesso_financeiro: true,
      },
      {
        role: 'academia_admin',
        nome: 'Admin Academia',
        descricao: 'Administrador de academia',
        nivel_hierarquico: 4,
        acesso_financeiro: true,
      },
      {
        role: 'academia_gestor',
        nome: 'Gestor Academia',
        descricao: 'Gestor de academia',
        nivel_hierarquico: 5,
        acesso_financeiro: false,
      },
      {
        role: 'professor',
        nome: 'Professor',
        descricao: 'Professor',
        nivel_hierarquico: 6,
        acesso_financeiro: false,
      },
      {
        role: 'atleta',
        nome: 'Atleta',
        descricao: 'Atleta',
        nivel_hierarquico: 7,
        acesso_financeiro: false,
      },
    ]

    // Get users under current user's management
    let usuariosQuery = supabase.from('user_roles').select(
      `
      user_id,
      role,
      federacao_id,
      academia_id,
      created_at,
      federacao:federacao_id(id, nome, sigla),
      academia:academia_id(id, nome, sigla)
    `
    )

    // Filter based on user's role
    if (perfil.role === 'master_access') {
      // Master can see all users except other masters
      usuariosQuery = usuariosQuery.not('role', 'eq', 'master_access')
    } else if (perfil.role === 'federacao_admin') {
      // Federacao admin can see users in their federation
      if (perfil.federacao_id) {
        usuariosQuery = usuariosQuery
          .eq('federacao_id', perfil.federacao_id)
          .not('role', 'eq', 'federacao_admin')
      } else {
        // Master-like federacao_admin (federacao_id NULL) can see all non-master users
        usuariosQuery = usuariosQuery.not('role', 'eq', 'master_access')
      }
    } else if (perfil.role === 'academia_admin') {
      // Academia admin can see users in their academia
      usuariosQuery = usuariosQuery
        .eq('academia_id', perfil.academia_id)
        .not('role', 'eq', 'academia_admin')
    } else {
      // Other roles cannot manage permissions
      return NextResponse.json(
        { error: 'Sem permissão para gerenciar permissões' },
        { status: 403 }
      )
    }

    const { data: usuarios, error: usuariosError } = await usuariosQuery

    if (usuariosError) {
      console.error('Error fetching usuarios:', usuariosError)
      return NextResponse.json(
        { error: 'Erro ao buscar usuários' },
        { status: 500 }
      )
    }

    const usuariosComNivel = (usuarios || []).map((usuario) => ({
      ...usuario,
      nivel_hierarquico: getNivelHierarquico(usuario.role) ?? 999,
    }))

    return NextResponse.json({
      usuarios: usuariosComNivel,
      rolesInfo,
      perfilAtual: {
        ...perfil,
        nivel_hierarquico: perfilNivel,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/permissoes:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar dados' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Get user's role
    const { data: perfil } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!perfil) {
      return NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 403 }
      )
    }

    const perfilNivel = getNivelHierarquico(perfil.role)
    if (!perfilNivel) {
      return NextResponse.json(
        { error: 'Perfil sem nível de acesso válido' },
        { status: 403 }
      )
    }

    const { user_id, role, federacao_id, academia_id } = await request.json()

    // Verify user can assign this role
    const { data: targetUser } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .maybeSingle()

    const targetNivel = getNivelHierarquico(targetUser?.role)
    if (!targetNivel || targetNivel <= perfilNivel) {
      return NextResponse.json(
        { error: 'Sem permissão para atribuir esse role' },
        { status: 403 }
      )
    }

    // Update role
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({
        role,
        federacao_id,
        academia_id,
      })
      .eq('user_id', user_id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Erro ao atualizar permissão' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/permissoes:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar permissão' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id é obrigatório' },
        { status: 400 }
      )
    }

    // Downgrade user to atleta role
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({
        role: 'atleta',
        federacao_id: null,
        academia_id: null,
      })
      .eq('user_id', userId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Erro ao remover permissão' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/permissoes:', error)
    return NextResponse.json(
      { error: 'Erro ao remover permissão' },
      { status: 500 }
    )
  }
}
