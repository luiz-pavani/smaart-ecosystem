#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('\n🔍 VERIFICAÇÃO RÁPIDA: ricolima2@gmail.com\n');
  console.log('='.repeat(60));
  
  // Check profile
  const { data: profile, error: pError } = await sb
    .from('profiles')
    .select('id, email, status, plan')
    .ilike('email', 'ricolima2@gmail.com')
    .single();
  
  if (pError) {
    console.log('❌ Profile:', pError.message);
  } else if (profile) {
    console.log('✅ Profile EXISTS');
    console.log(`   ID: ${profile.id}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Status: ${profile.status}`);
    console.log(`   Plan: ${profile.plan}`);
  } else {
    console.log('❌ Profile: NOT FOUND');
  }
  
  console.log('');
  
  // Check auth.users
  const { data: authData, error: aError } = await sb.auth.admin.listUsers();
  
  if (aError) {
    console.log('❌ Auth Check:', aError.message);
  } else {
    const authUser = authData.users.find(u => 
      u.email && u.email.toLowerCase() === 'ricolima2@gmail.com'
    );
    
    if (authUser) {
      console.log('✅ Auth User EXISTS');
      console.log(`   ID: ${authUser.id}`);
      console.log(`   Email: ${authUser.email}`);
      console.log(`   Created: ${authUser.created_at}`);
    } else {
      console.log('❌ Auth User: NOT FOUND');
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  
  // Diagnóstico
  if (profile && !authData.users.find(u => u.email && u.email.toLowerCase() === 'ricolima2@gmail.com')) {
    console.log('\n🚨 DIAGNÓSTICO: PERFIL ÓRFÃO CONFIRMADO');
    console.log('');
    console.log('O perfil existe no banco mas NÃO existe em auth.users');
    console.log('Por isso:');
    console.log('  - Usuário não consegue fazer login');
    console.log('  - Reset de senha falha com "User not found"');
    console.log('');
    console.log('💡 SOLUÇÃO:');
    console.log('   Executar: node scripts/fix-orphan-profile.js ricolima2@gmail.com');
    console.log('');
  } else if (profile && authData.users.find(u => u.email && u.email.toLowerCase() === 'ricolima2@gmail.com')) {
    const authUser = authData.users.find(u => u.email && u.email.toLowerCase() === 'ricolima2@gmail.com');
    if (profile.id !== authUser.id) {
      console.log('\n⚠️  DIAGNÓSTICO: IDs NÃO CORRESPONDEM');
      console.log(`   Profile ID: ${profile.id}`);
      console.log(`   Auth ID: ${authUser.id}`);
      console.log('');
      console.log('💡 SOLUÇÃO:');
      console.log('   Executar: node scripts/fix-orphan-profile.js ricolima2@gmail.com');
    } else {
      console.log('\n✅ Sistema OK - IDs correspondem');
      console.log('   Problema pode ser de senha ou outro fator');
    }
  }
  
  console.log('');
})().catch(console.error);
