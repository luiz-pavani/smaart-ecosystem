/**
 * Script para testar o endpoint /api/permissoes
 * Verifica se o usuário master tem acesso correto
 */

import { createClient } from '@supabase/supabase-js'

async function testPermissoes() {
  const projectUrl = 'https://risvafrrbnozyjquxvzi.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida')
    process.exit(1)
  }

  const supabase = createClient(projectUrl, serviceRoleKey)

  // 1. Verificar se usuário existe no auth
  console.log('\n1️⃣ Verificando usuário no auth...')
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error('❌ Erro ao listar users:', authError)
    return
  }

  const masterUser = users?.find(u => u.email === 'luizpavani@gmail.com')
  if (!masterUser) {
    console.error('❌ Usuário luizpavani@gmail.com NÃO ENCONTRADO no auth.users')
    return
  }

  console.log('✅ Usuário encontrado:', masterUser.id)
  console.log('   Email:', masterUser.email)
  console.log('   Criado:', masterUser.created_at)

  // 2. Verificar role no user_roles
  console.log('\n2️⃣ Verificando role no user_roles...')
  const { data: role, error: roleError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', masterUser.id)
    .maybeSingle()

  if (roleError) {
    console.error('❌ Erro na query user_roles:', roleError)
    return
  }

  if (!role) {
    console.error('❌ CRÍTICO: Usuário NÃO TEM ENTRADA em user_roles!')
    console.log('   Este é o problema - a role não foi criada.')
    
    // Vamos criar agora
    console.log('\n3️⃣ Criando role de federacao_admin...')
    const { data: newRole, error: createError } = await supabase
      .from('user_roles')
      .insert({
        user_id: masterUser.id,
        role: 'federacao_admin',
        federacao_id: null,
        academia_id: null,
        permissions: {},
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Erro ao criar role:', createError)
      return
    }

    console.log('✅ Role criada com sucesso!')
    console.log('   ID:', newRole.id)
    console.log('   Role:', newRole.role)
    console.log('   Federacao:', newRole.federacao_id)
    return
  }

  console.log('✅ Role encontrada:')
  console.log('   ID:', role.id)
  console.log('   Role:', role.role)
  console.log('   Federacao:', role.federacao_id)
  console.log('   Academia:', role.academia_id)
  console.log('   Permissions:', role.permissions)

  // 3. Verificar se consegue fazer query como a API faz
  console.log('\n3️⃣ Simulando query da API...')
  const { data: apiSimulation, error: apiError } = await supabase
    .from('user_roles')
    .select('role, federacao_id, academia_id')
    .eq('user_id', masterUser.id)
    .maybeSingle()

  if (apiError) {
    console.error('❌ Erro na simulação:', apiError)
    return
  }

  if (!apiSimulation) {
    console.error('❌ API Simulation retornou NULL - isto causaria "Perfil não encontrado"')
    return
  }

  console.log('✅ API Simulation funcionou:')
  console.log('   Role:', apiSimulation.role)
  console.log('   Federacao:', apiSimulation.federacao_id)
  console.log('   Academia:', apiSimulation.academia_id)

  console.log('\n✅ TUDO OK - O usuário deve conseguir acessar /permissoes')
}

testPermissoes().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
