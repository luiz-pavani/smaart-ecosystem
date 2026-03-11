import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Roles que podem gerenciar permissões de outros
const ROLES_GESTORES = ['master_access', 'federacao_admin', 'federacao_gestor', 'academia_admin', 'academia_gestor']

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar perfil do usuário logado na tabela stakeholders
    const { data: perfil, error: perfilError } = await supabase
      .from('stakeholders')
      .select('id, role, federacao_id, academia_id, nome_completo, email')
      .eq('id', user.id)
      .maybeSingle()

    if (perfilError) {
      console.error('[PERMISSOES] Error fetching stakeholder perfil:', perfilError)
      return NextResponse.json(
        { error: 'Perfil não encontrado', details: perfilError.message },
        { status: 403 }
      )
    }

    if (!perfil) {
      return NextResponse.json(
        { error: 'Perfil não encontrado', userId: user.id },
        { status: 403 }
      )
    }

    // Buscar todos os roles disponíveis da tabela roles (via vw_roles_info)
    const { data: rolesInfoRaw } = await supabase
      .from('vw_roles_info')
      .select('role, nome, descricao, nivel_hierarquico, acesso_financeiro')
      .order('nivel_hierarquico', { ascending: true })

    const rolesInfo = rolesInfoRaw || []

    const perfilRoleInfo = rolesInfo.find((r) => r.role === perfil.role)
    const perfilNivel = perfilRoleInfo?.nivel_hierarquico ?? 999

    // Somente gestores podem ver a lista de usuários
    if (!ROLES_GESTORES.includes(perfil.role ?? '')) {
      return NextResponse.json(
        { error: 'Sem permissão para gerenciar permissões' },
        { status: 403 }
      )
    }

    // Buscar stakeholders vinculados ao usuário logado
    let usuariosQuery = supabase
      .from('stakeholders')
      .select(
        `id, role, federacao_id, academia_id, nome_completo, email,
         federacao:federacao_id(id, nome, sigla),
         academia:academia_id(id, nome, sigla)`
      )
      .neq('id', user.id) // excluir o próprio usuário

    if (perfil.role === 'master_access') {
      // Master vê todos exceto outros masters
      usuariosQuery = usuariosQuery.not('role', 'eq', 'master_access')
    } else if (perfil.role === 'federacao_admin' || perfil.role === 'federacao_gestor') {
      if (perfil.federacao_id) {
        usuariosQuery = usuariosQuery
          .eq('federacao_id', perfil.federacao_id)
          .not('role', 'in', '("master_access","federacao_admin")')
      } else {
        // federacao_admin sem federacao_id — vê todos exceto masters
        usuariosQuery = usuariosQuery.not('role', 'eq', 'master_access')
      }
    } else if (perfil.role === 'academia_admin' || perfil.role === 'academia_gestor') {
      if (perfil.academia_id) {
        usuariosQuery = usuariosQuery
          .eq('academia_id', perfil.academia_id)
          .not('role', 'in', '("master_access","federacao_admin","academia_admin")')
      } else {
        return NextResponse.json({ usuarios: [], rolesInfo, perfilAtual: { ...perfil, nivel_hierarquico: perfilNivel } })
      }
    }

    const { data: usuarios, error: usuariosError } = await usuariosQuery

    if (usuariosError) {
      console.error('Error fetching usuarios:', usuariosError)
      return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
    }

    const usuariosComNivel = (usuarios || []).map((u) => ({
      ...u,
      nivel_hierarquico: rolesInfo.find((r) => r.role === u.role)?.nivel_hierarquico ?? 999,
    }))

    return NextResponse.json({
      usuarios: usuariosComNivel,
      rolesInfo,
      perfilAtual: { ...perfil, nivel_hierarquico: perfilNivel },
    })
  } catch (error) {
    console.error('Error in GET /api/permissoes:', error)
    return NextResponse.json({ error: 'Erro ao carregar dados' }, { status: 500 })
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

    // Buscar perfil do usuário logado
    const { data: perfil } = await supabase
      .from('stakeholders')
      .select('role, federacao_id, academia_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!perfil || !ROLES_GESTORES.includes(perfil.role ?? '')) {
      return NextResponse.json({ error: 'Sem permissão para gerenciar permissões' }, { status: 403 })
    }

    // Buscar nível do usuário logado
    const { data: perfilRoleInfo } = await supabase
      .from('vw_roles_info')
      .select('nivel_hierarquico')
      .eq('role', perfil.role)
      .maybeSingle()

    const perfilNivel = perfilRoleInfo?.nivel_hierarquico ?? 999

    // Dados do target a ter o role atualizado
    const { stakeholder_id, role, federacao_id, academia_id } = await request.json()

    if (!stakeholder_id || !role) {
      return NextResponse.json({ error: 'stakeholder_id e role são obrigatórios' }, { status: 400 })
    }

    // Verificar nível do role que será atribuído
    const { data: novoRoleInfo } = await supabase
      .from('vw_roles_info')
      .select('nivel_hierarquico')
      .eq('role', role)
      .maybeSingle()

    const novoNivel = novoRoleInfo?.nivel_hierarquico ?? 999

    // Só pode atribuir roles abaixo do próprio nível
    if (novoNivel <= perfilNivel) {
      return NextResponse.json(
        { error: 'Sem permissão para atribuir esse nível de acesso' },
        { status: 403 }
      )
    }

    // Verificar se target está no escopo do usuário logado
    const { data: target } = await supabase
      .from('stakeholders')
      .select('role, federacao_id, academia_id')
      .eq('id', stakeholder_id)
      .maybeSingle()

    if (!target) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar escopo
    const { data: targetRoleInfo } = await supabase
      .from('vw_roles_info')
      .select('nivel_hierarquico')
      .eq('role', target.role)
      .maybeSingle()

    const targetNivel = targetRoleInfo?.nivel_hierarquico ?? 999

    if (targetNivel <= perfilNivel) {
      return NextResponse.json(
        { error: 'Sem permissão para alterar este usuário' },
        { status: 403 }
      )
    }

    // Atualizar role no stakeholder
    const { error: updateError } = await supabase
      .from('stakeholders')
      .update({
        role,
        federacao_id: federacao_id ?? target.federacao_id,
        academia_id: academia_id ?? target.academia_id,
      })
      .eq('id', stakeholder_id)

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao atualizar permissão' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/permissoes:', error)
    return NextResponse.json({ error: 'Erro ao salvar permissão' }, { status: 500 })
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
    const stakeholderId = searchParams.get('stakeholder_id') || searchParams.get('user_id')

    if (!stakeholderId) {
      return NextResponse.json({ error: 'stakeholder_id é obrigatório' }, { status: 400 })
    }

    // Verificar permissão do usuário logado
    const { data: perfil } = await supabase
      .from('stakeholders')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!perfil || !ROLES_GESTORES.includes(perfil.role ?? '')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Revogar: rebaixar para 'atleta' sem vínculo organizacional
    const { error: updateError } = await supabase
      .from('stakeholders')
      .update({ role: 'atleta' })
      .eq('id', stakeholderId)

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao remover permissão' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/permissoes:', error)
    return NextResponse.json({ error: 'Erro ao remover permissão' }, { status: 500 })
  }
}
