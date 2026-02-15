#!/usr/bin/env node
/**
 * Diagnóstico detalhado do usuário ricolima2@gmail.com
 * Verifica auth.users e profiles
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseAuthIssue() {
  const email = 'ricolima2@gmail.com';
  
  console.log('\n🔍 DIAGNÓSTICO DETALHADO - PROBLEMA DE AUTENTICAÇÃO\n');
  console.log('='.repeat(70));
  console.log(`📧 Email: ${email}`);
  console.log('='.repeat(70));

  // 1. Verificar na tabela profiles
  console.log('\n1️⃣  VERIFICANDO TABELA PROFILES...\n');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email)
    .single();

  if (profileError) {
    console.error('❌ Erro ao buscar profile:', profileError.message);
  } else if (!profile) {
    console.log('❌ Perfil NÃO encontrado na tabela profiles');
  } else {
    console.log('✅ Perfil encontrado na tabela profiles:');
    console.log(`   ID: ${profile.id}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Nome: ${profile.full_name}`);
    console.log(`   Status: ${profile.status}`);
    console.log(`   Created: ${profile.created_at}`);
  }

  // 2. Verificar na tabela auth.users usando Admin API
  console.log('\n2️⃣  VERIFICANDO TABELA AUTH.USERS...\n');
  
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao listar auth.users:', authError.message);
    } else {
      const authUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!authUser) {
        console.log('❌ USUÁRIO NÃO ENCONTRADO EM AUTH.USERS');
        console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
        console.log('   O perfil existe na tabela profiles, mas NÃO existe em auth.users');
        console.log('   Isso acontece quando:');
        console.log('   - Perfil foi criado diretamente no banco (sem signup)');
        console.log('   - Usuário foi deletado de auth.users mas não de profiles');
        console.log('   - Houve erro durante o signup');
      } else {
        console.log('✅ Usuário encontrado em auth.users:');
        console.log(`   ID: ${authUser.id}`);
        console.log(`   Email: ${authUser.email}`);
        console.log(`   Confirmado: ${authUser.email_confirmed_at ? 'Sim' : 'Não'}`);
        console.log(`   Criado: ${authUser.created_at}`);
        console.log(`   Último login: ${authUser.last_sign_in_at || 'Nunca'}`);
        
        // Verificar se os IDs batem
        if (profile && profile.id !== authUser.id) {
          console.log('\n⚠️  INCONSISTÊNCIA DETECTADA:');
          console.log(`   Profile ID: ${profile.id}`);
          console.log(`   Auth User ID: ${authUser.id}`);
          console.log('   Os IDs não correspondem!');
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro ao acessar auth.users:', err.message);
  }

  // 3. Verificar outras contas com emails similares
  console.log('\n3️⃣  VERIFICANDO EMAILS SIMILARES...\n');
  const { data: similarProfiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, status')
    .ilike('email', '%ricolima%');

  if (similarProfiles && similarProfiles.length > 0) {
    console.log(`📋 Encontrados ${similarProfiles.length} perfil(is) com "ricolima":`);
    similarProfiles.forEach(p => {
      console.log(`   - ${p.email} (${p.status})`);
    });
  }

  // RESUMO E SOLUÇÕES
  console.log('\n' + '='.repeat(70));
  console.log('💡 SOLUÇÕES POSSÍVEIS');
  console.log('='.repeat(70));

  if (profile && !authUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())) {
    console.log('\n✅ OPÇÃO 1: Criar usuário em auth.users');
    console.log('   Execute este comando (substitua SENHA):');
    console.log(`   
   const { data, error } = await supabase.auth.admin.createUser({
     email: '${email}',
     password: 'SENHA_TEMPORARIA',
     email_confirm: true,
     user_metadata: {
       full_name: '${profile.full_name}'
     }
   });
   
   // Depois atualize o profile.id com o novo auth.uid
   await supabase.from('profiles')
     .update({ id: data.user.id })
     .eq('email', '${email}');
    `);

    console.log('\n✅ OPÇÃO 2: Deletar perfil antigo e pedir novo signup');
    console.log('   Mais seguro, mas usuário perde histórico');

    console.log('\n✅ OPÇÃO 3: Usar script de correção automática');
    console.log('   Execute: node scripts/fix-orphan-profile.js ricolima2@gmail.com');
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

diagnoseAuthIssue().catch(console.error);
