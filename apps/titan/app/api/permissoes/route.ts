import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List all users with their roles (filtered by permission)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Get current user role
    const { data: perfil } = await supabase
      .from('user_roles')
      .select('role, nivel_hierarquico, federacao_id, academia_id')
      .eq('user_id', user.id)
      .single()

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
    }

    // Build query based on user's permissions
    let query = supabase
      .from('user_roles')
      .select(`
        *,
        federacao:federacoes(nome, sigla),
        academia:academias(nome, sigla)
      `)
      .order('nivel_hierarquico', { ascending: true })

    // Filter based on role
    if (perfil.role === 'master_access') {
      // Master sees everyone - no filter needed
    } else if (perfil.role === 'federacao_admin' || perfil.role === 'federacao_gestor') {
      // Federacao sees only their federation
      if (perfil.federacao_id) {
        query = query.eq('federacao_id', perfil.federacao_id)
      }
    } else if (perfil.role === 'academia_admin' || perfil.role === 'academia_gestor') {
      // Academia sees only their academia
      if (perfil.academia_id) {
        query = query.eq('academia_id', perfil.academia_id)
      }
    } else {
      // Professors and athletes cannot manage permissions
      return NextResponse.json({ error: 'Sem permissão para gerenciar usuários' }, { status: 403 })
    }

    const { data: usuarios, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
    }

    // Filter out current user from the list
    const usuariosFiltrados = (usuarios || []).filter(u => u.user_id !== user.id)

    // Get role descriptions
    const { data: rolesInfo } = await supabase
      .from('vw_roles_info')
      .select('*')

    console.log('Permissoes API:', {
      currentUser: user.id,
      currentRole: perfil.role,
      totalUsersFound: usuarios?.length,
      afterFilter: usuariosFiltrados.length,
      availableRoles: rolesInfo?.length
    })

    return NextResponse.json({ 
      usuarios: usuariosFiltrados,
      rolesInfo,
      perfilAtual: perfil 
    })
  } catch (error) {
    console.error('Error in GET /api/permissoes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST: Assign role to user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, role, federacao_id, academia_id } = body

    if (!user_id || !role) {
      return NextResponse.json({ 
        error: 'user_id e role são obrigatórios' 
      }, { status: 400 })
    }

    // Check if current user can grant this permission
    const { data: canGrant, error: grantError } = await supabase
      .rpc('pode_atribuir_permissao', {
        usuario_que_atribui_id: user.id,
        role_a_atribuir: role,
        federacao_alvo_id: federacao_id || null,
        academia_alvo_id: academia_id || null,
      })

    if (grantError) {
      console.error('Error checking permission:', grantError)
      return NextResponse.json({ error: 'Erro ao verificar permissão' }, { status: 500 })
    }

    if (!canGrant) {
      return NextResponse.json({ 
        error: 'Você não tem permissão para atribuir este nível de acesso' 
      }, { status: 403 })
    }

    // Assign role
    const { error: updateError } = await supabase
      .from('user_roles')
      .upsert({
        user_id,
        role,
        federacao_id: federacao_id || null,
        academia_id: academia_id || null,
      })

    if (updateError) {
      console.error('Error assigning role:', updateError)
      return NextResponse.json({ error: 'Erro ao atribuir permissão' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Permissão atribuída com sucesso',
      role 
    })
  } catch (error) {
    console.error('Error in POST /api/permissoes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE: Remove user role (set to lowest level)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('user_id')

    if (!targetUserId) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 })
    }

    // Get current user role
    const { data: perfil } = await supabase
      .from('user_roles')
      .select('role, nivel_hierarquico, federacao_id, academia_id')
      .eq('user_id', user.id)
      .single()

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
    }

    // Get target user role
    const { data: targetPerfil } = await supabase
      .from('user_roles')
      .select('role, nivel_hierarquico, federacao_id, academia_id')
      .eq('user_id', targetUserId)
      .single()

    if (!targetPerfil) {
      return NextResponse.json({ error: 'Usuário alvo não encontrado' }, { status: 404 })
    }

    // Check if current user can remove this permission
    if (targetPerfil.nivel_hierarquico <= perfil.nivel_hierarquico) {
      return NextResponse.json({ 
        error: 'Você não pode remover permissões de usuários no mesmo nível ou acima' 
      }, { status: 403 })
    }

    // Check scope
    if (perfil.role === 'federacao_admin' || perfil.role === 'federacao_gestor') {
      if (targetPerfil.federacao_id !== perfil.federacao_id) {
        return NextResponse.json({ 
          error: 'Você só pode remover permissões dentro da sua federação' 
        }, { status: 403 })
      }
    } else if (perfil.role === 'academia_admin' || perfil.role === 'academia_gestor') {
      if (targetPerfil.academia_id !== perfil.academia_id) {
        return NextResponse.json({ 
          error: 'Você só pode remover permissões dentro da sua academia' 
        }, { status: 403 })
      }
    }

    // Downgrade to atleta
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({ role: 'atleta' })
      .eq('user_id', targetUserId)

    if (updateError) {
      console.error('Error removing role:', updateError)
      return NextResponse.json({ error: 'Erro ao remover permissão' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Permissão removida com sucesso' })
  } catch (error) {
    console.error('Error in DELETE /api/permissoes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
