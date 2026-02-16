#!/usr/bin/env node
// Update Federation Name

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateFederation() {
  console.log('🔄 Updating federation name...\n');

  try {
    const { data, error } = await supabase
      .from('federacoes')
      .update({
        nome: 'Liga Riograndense de Judô'
      })
      .eq('sigla', 'LRSJ')
      .select();

    if (error) throw error;

    console.log('✅ Federation updated successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏢 Nome:   ${data[0].nome}`);
    console.log(`🔖 Sigla:  ${data[0].sigla}`);
    console.log(`🎨 Cores:  ${data[0].cor_primaria} / ${data[0].cor_secundaria}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  }
}

updateFederation();
