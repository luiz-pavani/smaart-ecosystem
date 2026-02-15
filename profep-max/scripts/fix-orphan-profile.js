#!/usr/bin/env node
/**
 * Script para corrigir perfil órfão (profile sem auth.user correspondente)
 * Cria usuário em auth.users e sincroniza com profile existente
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOrphanProfile(email, temporaryPassword) {
  console.log('\n🔧 CORRIGINDO PERFIL ÓRFÃO\n');
  console.log('='.repeat(70));
  console.log(`📧 Email: ${email}`);
  console.log('='.repeat(70));

  // 1. Verificar se profile existe
  console.log('\n1️⃣  Verificando perfil existente...\n');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email)
    .single();

  if (profileError || !profile) {
    console.log('❌ Perfil não encontrado. Execute diagnose-auth-issue.js primeiro.');
    return;
  }

  console.log('✅ Perfil encontrado:');
  console.log(`   ID atual: ${profile.id}`);
  console.log(`   Nome: ${profile.full_name}`);
  console.log(`   Status: ${profile.status}`);

  // 2. Verificar se já existe em auth.users
  console.log('\n2️⃣  Verificando auth.users...\n');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const existingAuthUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (existingAuthUser) {
    console.log('ℹ️  Usuário já existe em auth.users:');
    console.log(`   Auth ID: ${existingAuthUser.id}`);
    console.log(`   Profile ID: ${profile.id}`);
    
    if (existingAuthUser.id !== profile.id) {
      console.log('\n⚠️  IDs não correspondem. Atualizando profile...');
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ id: existingAuthUser.id })
        .eq('email', email);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar profile:', updateError.message);
      } else {
        console.log('✅ Profile.id atualizado para corresponder ao auth.user.id');
      }
    } else {
      console.log('✅ IDs já correspondem. Sistema OK.');
    }
    return;
  }

  // 3. Criar usuário em auth.users
  console.log('\n3️⃣  Criando usuário em auth.users...\n');
  console.log(`   Senha temporária: ${temporaryPassword}`);
  
  const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
    email: email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: profile.full_name || 'Usuário'
    }
  });

  if (createError) {
    console.error('❌ Erro ao criar usuário:', createError.message);
    return;
  }

  console.log('✅ Usuário criado em auth.users:');
  console.log(`   Novo Auth ID: ${newAuthUser.user.id}`);

  // 4. Atualizar profile.id para corresponder ao novo auth.user.id
  console.log('\n4️⃣  Sincronizando IDs...\n');
  
  const oldProfileId = profile.id;
  const newAuthId = newAuthUser.user.id;
  
  // Primeiro, atualizar referências em outras tabelas (se houver)
  console.log('   Atualizando referências em outras tabelas...');
  
  // vendas
  await supabase
    .from('vendas')
    .update({ email: email }) // Garante que email está correto
    .ilike('email', email);
  
  // subscription_events
  await supabase
    .from('subscription_events')
    .update({ email: email })
    .ilike('email', email);

  // Agora atualizar o profile.id
  console.log('   Atualizando profile.id...');
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ id: newAuthId })
    .eq('id', oldProfileId);

  if (updateError) {
    console.error('❌ Erro ao atualizar profile.id:', updateError.message);
    console.log('\n⚠️  AÇÃO MANUAL NECESSÁRIA:');
    console.log(`   1. Delete o perfil antigo: DELETE FROM profiles WHERE id = '${oldProfileId}';`);
    console.log(`   2. Insira um novo com o auth ID correto`);
    return;
  }

  console.log('✅ Profile.id atualizado com sucesso!');

  // 5. Verificação final
  console.log('\n5️⃣  Verificação final...\n');
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('id, email, status')
    .eq('id', newAuthId)
    .single();

  if (updatedProfile) {
    console.log('✅ Perfil sincronizado:');
    console.log(`   ID: ${updatedProfile.id}`);
    console.log(`   Email: ${updatedProfile.email}`);
    console.log(`   Status: ${updatedProfile.status}`);
  }

  // RESUMO
  console.log('\n' + '='.repeat(70));
  console.log('✅ CORREÇÃO CONCLUÍDA');
  console.log('='.repeat(70));
  console.log('\n📋 Próximos passos:');
  console.log(`   1. Usuário pode fazer login com: ${email}`);
  console.log(`   2. Senha temporária: ${temporaryPassword}`);
  console.log('   3. Peça ao usuário para alterar a senha no primeiro login');
  console.log('   4. Teste o acesso aos cursos');
  console.log('\n' + '='.repeat(70) + '\n');
}

// Uso
const email = process.argv[2];
const password = process.argv[3] || 'TempPass2026!';

if (!email) {
  console.error('❌ Uso: node scripts/fix-orphan-profile.js <email> [senha-temporaria]');
  console.error('   Exemplo: node scripts/fix-orphan-profile.js user@example.com MinhaSenh@123');
  process.exit(1);
}

fixOrphanProfile(email, password).catch(console.error);
