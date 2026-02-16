#!/usr/bin/env node
// Setup Admin User for Titan Platform
// Creates user, federation, and assigns admin role

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local');
  process.exit(1);
}

async function setupAdmin() {
  console.log('🚀 Starting admin setup...\n');

  try {
    // Step 1: Create user in auth
    console.log('1️⃣ Creating admin user...');
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: 'Secretaria LRSJ'
      }
    });

    if (userError) {
      // Check if user already exists
      if (userError.message.includes('already registered')) {
        console.log('⚠️  User already exists, fetching...');
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === ADMIN_EMAIL);
        if (!existingUser) {
          throw new Error('User exists but could not be fetched');
        }
        userData.user = existingUser;
        console.log(`✅ Using existing user: ${existingUser.id}`);
      } else {
        throw userError;
      }
    } else {
      console.log(`✅ User created: ${userData.user.id}`);
    }

    const userId = userData.user.id;

    // Step 2: Create LRSJ federation
    console.log('\n2️⃣ Creating LRSJ federation...');
    const { data: fedData, error: fedError } = await supabase
      .from('federacoes')
      .insert([{
        nome: 'Liga Riograndense de Judô',
        sigla: 'LRSJ',
        email: 'contato@lrsj.com.br',
        telefone: '(11) 98765-4321',
        site: 'https://lrsj.com.br',
        cor_primaria: '#16A34A', // Verde
        cor_secundaria: '#DC2626', // Vermelho
        endereco_cidade: 'São José dos Campos',
        endereco_estado: 'SP',
        ativo: true
      }])
      .select()
      .single();

    if (fedError) {
      // Check if federation already exists
      if (fedError.code === '23505') { // Unique violation
        console.log('⚠️  Federation already exists, fetching...');
        const { data: existingFed } = await supabase
          .from('federacoes')
          .select('*')
          .eq('sigla', 'LRSJ')
          .single();
        
        if (!existingFed) {
          throw new Error('Federation exists but could not be fetched');
        }
        fedData = existingFed;
        console.log(`✅ Using existing federation: ${existingFed.id}`);
      } else {
        throw fedError;
      }
    } else {
      console.log(`✅ Federation created: ${fedData.id}`);
    }

    const federacaoId = fedData.id;

    // Step 3: Assign federacao_admin role
    console.log('\n3️⃣ Assigning admin role...');
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .insert([{
        user_id: userId,
        role: 'federacao_admin',
        federacao_id: federacaoId,
        permissions: { all: true }
      }])
      .select()
      .single();

    if (roleError) {
      if (roleError.code === '23505') { // Unique violation
        console.log('⚠️  Role already assigned');
      } else {
        throw roleError;
      }
    } else {
      console.log(`✅ Role assigned: ${roleData.id}`);
    }

    // Step 4: Verify setup
    console.log('\n4️⃣ Verifying setup...');
    const { data: verification, error: verifyError } = await supabase
      .from('user_roles')
      .select(`
        role,
        federacoes (nome, sigla)
      `)
      .eq('user_id', userId)
      .single();

    if (verifyError) throw verifyError;

    console.log('\n✅ SETUP COMPLETE!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email:      ${ADMIN_EMAIL}`);
    console.log(`👤 User ID:    ${userId}`);
    console.log(`🏢 Federation: ${verification.federacoes.nome} (${verification.federacoes.sigla})`);
    console.log(`🎯 Role:       ${verification.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 Login at: http://localhost:3000/login\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  }
}

setupAdmin();
