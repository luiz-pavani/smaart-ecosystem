/**
 * Script para fazer upgrade do usuário para Master Access (Nível 1)
 */

const { createClient } = require('@supabase/supabase-js')

const EMAIL = 'luizpavani@gmail.com'
const projectUrl = 'https://risvafrrbnozyjquxvzi.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida')
  process.exit(1)
}

const supabase = createClient(projectUrl, serviceRoleKey)

async function upgradeToMaster() {
  console.log(`\n🔄 Upgrading ${EMAIL} to Master Access...`)

  // 1. Buscar usuário
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error('❌ Erro ao buscar usuários:', authError)
    return
  }

  const user = users?.find(u => u.email === EMAIL)
  if (!user) {
    console.error(`❌ Usuário ${EMAIL} não encontrado`)
    return
  }

  console.log('✅ Usuário encontrado:', user.id)

  // 2. Buscar role atual
  const { data: currentRoles, error: roleError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)

  if (roleError) {
    console.error('❌ Erro ao buscar roles:', roleError)
    return
  }

  console.log('\n📋 Roles atuais:')
  console.table(currentRoles)

  if (!currentRoles || currentRoles.length === 0) {
    console.error('❌ Nenhuma role encontrada para este usuário')
    return
  }

  // 3. Atualizar para master_access
  const roleId = currentRoles[0].id

  const { data: updatedRole, error: updateError } = await supabase
    .from('user_roles')
    .update({
      role: 'master_access',
      federacao_id: null,
      academia_id: null,
      permissions: {},
    })
    .eq('id', roleId)
    .select()
    .single()

  if (updateError) {
    console.error('❌ Erro ao atualizar role:', updateError)
    return
  }

  console.log('\n✅ UPGRADE COMPLETO!')
  console.log('📊 Nova role:')
  console.table([updatedRole])

  console.log('\n🎉 Usuário agora tem Master Access (Nível 1)')
  console.log('   • Acesso total ao sistema')
  console.log('   • Pode gerenciar todas as federações')
  console.log('   • Pode gerenciar todas as academias')
  console.log('   • Pode criar outros administradores')
}

upgradeToMaster().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
