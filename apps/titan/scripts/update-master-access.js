#!/usr/bin/env node
/**
 * Script para verificar e atualizar acesso master admin
 * Garante que luizpavani@gmail.com tem federacao_id NULL para acesso a TODAS as federações
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://risvafrrbnozyjquxvzi.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada')
  process.exit(1)
}

const EMAIL = 'luizpavani@gmail.com'

async function updateMasterAccess() {
  console.log('🔍 Verificando acesso master admin...\n')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // 1. Buscar userId
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find(u => u.email === EMAIL)
    
    if (!user) {
      console.error('❌ Usuário não encontrado')
      process.exit(1)
    }
    
    const userId = user.id
    console.log('✅ Usuário encontrado:', userId)
    
    // 2. Verificar roles atuais
    console.log('\n📋 Roles atuais:')
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
    
    if (rolesError) throw rolesError
    
    console.table(roles)
    
    // 3. Verificar se tem federacao_admin com federacao_id NULL
    const masterRole = roles?.find(r => 
      r.role === 'federacao_admin' && r.federacao_id === null
    )
    
    if (masterRole) {
      console.log('\n✅ ACESSO MASTER JÁ CONFIGURADO!')
      console.log('   • Role: federacao_admin')
      console.log('   • Federacao: NULL (acessa TODAS)')
      console.log('   • Academia: NULL (acessa TODAS)')
      return
    }
    
    // 4. Atualizar para master access (federacao_id NULL)
    console.log('\n🔧 Atualizando para acesso master...')
    
    // Deletar roles existentes
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
    
    if (deleteError) throw deleteError
    
    // Inserir role master
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'federacao_admin',
        federacao_id: null, // NULL = acessa TODAS as federações
        academia_id: null    // NULL = acessa TODAS as academias
      })
    
    if (insertError) throw insertError
    
    console.log('✅ Acesso master configurado!')
    
    // 5. Verificar resultado
    const { data: newRoles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
    
    console.log('\n📋 Nova configuração:')
    console.table(newRoles)
    
    console.log('\n✨ CONFIGURAÇÃO COMPLETA!')
    console.log('\n📝 Credenciais:')
    console.log('   Email: luizpavani@gmail.com')
    console.log('   Senha: Gold8892#')
    console.log('\n🌐 Acesso: https://titan.smaartpro.com')
    console.log('\n🔓 Permissões: TODAS federações, TODAS academias, TODOS atletas')
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message)
    if (error.code) console.error('   Código:', error.code)
    process.exit(1)
  }
}

updateMasterAccess()
