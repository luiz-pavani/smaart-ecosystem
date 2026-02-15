#!/usr/bin/env node

/**
 * Script simplificado para verificar perfil órfão
 * Usa apenas queries SQL diretas
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔍 Diagnóstico Simplificado\n');
console.log('URL:', URL ? 'Configurado' : 'FALTANDO');
console.log('KEY:', KEY ? 'Configurado' : 'FALTANDO');
console.log('');

if (!URL || !KEY) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(URL, KEY);

async function check() {
  try {
    console.log('Buscando profile...');
    
    // Query direto na tabela profiles
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'ricolima2@gmail.com');
    
    if (pError) {
      console.error('❌ Erro profiles:', pError.message);
      return;
    }
    
    console.log(`Profiles encontrados: ${profiles.length}`);
    if (profiles.length > 0) {
      const p = profiles[0];
      console.log('Profile:');
      console.log('  ID:', p.id);
      console.log('  Email:', p.email);
      console.log('  Status:', p.status);
      console.log('  Plan:', p.plan);
    }
    
    console.log('\nBuscando auth user...');
    
    // Tenta listar usuários auth
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (listError) {
      console.error('❌ Erro auth.admin.listUsers:', listError.message);
      return;
    }
    
    console.log(`Total auth users: ${listData.users.length}`);
    
    const authUser = listData.users.find(u => u.email === 'ricolima2@gmail.com');
    
    if (authUser) {
      console.log('Auth User encontrado:');
      console.log('  ID:', authUser.id);
      console.log('  Email:', authUser.email);
    } else {
      console.log('❌ Auth User NÃO encontrado');
    }
    
    // Diagnóstico final
    console.log('\n' + '='.repeat(60));
    if (profiles.length > 0 && !authUser) {
      console.log('🚨 PERFIL ÓRFÃO CONFIRMADO');
      console.log('');
      console.log('Profile existe mas auth.users não tem registro');
      console.log('');
      console.log('Para corrigir:');
      console.log('  node scripts/fix-orphan-profile.js ricolima2@gmail.com Senha123!');
    } else if (profiles.length > 0 && authUser && profiles[0].id !== authUser.id) {
      console.log('⚠️  IDs DIFERENTES');
      console.log(`  Profile ID: ${profiles[0].id}`);
      console.log(`  Auth ID: ${authUser.id}`);
    } else if (profiles.length > 0 && authUser) {
      console.log('✅ TUDO OK');
      console.log('Profile e Auth User existem e IDs correspondem');
    } else {
      console.log('❌ Profile não encontrado');
    }
    console.log('='.repeat(60) + '\n');
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error(err);
  }
}

check();
