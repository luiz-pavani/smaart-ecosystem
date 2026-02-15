#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deactivateTestProfile() {
  console.log('\n🔧 DESATIVANDO PERFIL DE TESTE\n');
  
  const testEmail = 'me@masteresportes.com';
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      status: 'inactive',
      plan: null,
      subscription_status: 'canceled'
    })
    .eq('email', testEmail);
  
  if (error) {
    console.error('❌ Erro:', error.message);
  } else {
    console.log(`✅ Profile ${testEmail} desativado`);
  }
}

deactivateTestProfile();
