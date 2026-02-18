#!/usr/bin/env node
/**
 * Script para criar usuário master admin no Supabase
 * Email: luizpavani@gmail.com
 * Senha: Gold8892#
 * Role: federacao_admin (máximo nível de acesso disponível)
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://risvafrrbnozyjquxvzi.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente')
  process.exit(1)
}

const EMAIL = 'luizpavani@gmail.com'
const PASSWORD = 'Gold8892#'

async function createMasterAdmin() {
  console.log('🚀 Iniciando criação do usuário master admin...\n')
  
  // Criar cliente com service role key (tem permissões administrativas)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // 1. Verificar se o usuário já existe
    console.log('🔍 Verificando se usuário já existe...')
    const { data: existingUsers, error: checkError } = await supabase.auth.admin.listUsers()
    
    if (checkError) throw checkError
    
    const existingUser = existingUsers.users.find(u => u.email === EMAIL)
    
    let userId
    
    if (existingUser) {
      console.log('✅ Usuário já existe:', existingUser.id)
      userId = existingUser.id
    } else {
      // 2. Criar usuário
      console.log('📝 Criando novo usuário...')
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Luiz Pavani',
          role: 'super_admin'
        }
      })
      
      if (createError) throw createError
      
      console.log('✅ Usuário criado:', newUser.user.id)
      userId = newUser.user.id
    }

    // 3. Verificar se já tem role super_admin
    console.log('\n🔍 Verificando roles existentes...')
    const { data: existingRoles, error: roleCheckError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
    
    if (roleCheckError) throw roleCheckError
    
    const hasSuperAdmin = existingRoles?.some(r => r.role === 'federacao_admin')
    
    if (hasSuperAdmin) {
      console.log('ℹ️  Usuário já tem role federacao_admin')
    } else {
      // 4. Adicionar role federacao_admin (máximo acesso permitido)
      console.log('📝 Adicionando role federacao_admin...')
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'federacao_admin',
          federacao_id: null,
          academia_id: null
        })
      
      if (insertError) throw insertError
      
      console.log('✅ Role federacao_admin adicionada')
    }

    // 5. Verificar resultado final
    console.log('\n📊 Verificando configuração final...')
    const { data: finalRoles, error: finalError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
    
    if (finalError) throw finalError
    
    console.log('\n✅ USUÁRIO MASTER ADMIN CONFIGURADO COM SUCESSO!\n')
    console.log('Credenciais:')
    console.log(`  Email: ${EMAIL}`)
    console.log(`  Senha: ${PASSWORD}`)
    console.log(`  User ID: ${userId}`)
    console.log('\nRoles:')
    finalRoles?.forEach(role => {
      console.log(`  - ${role.role}`)
    })
    console.log('\n🌐 Acesse: https://titan.smaartpro.com\n')

  } catch (error) {
    console.error('\n❌ ERRO:', error.message)
    console.error('\nDetalhes:', error)
    process.exit(1)
  }
}

// Executar
createMasterAdmin()
