#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVendasStructure() {
  // Pegar uma venda existente para ver a estrutura
  const { data, error } = await supabase
    .from('vendas')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Erro:', error);
    return;
  }
  
  if (data.length > 0) {
    console.log('Estrutura da tabela vendas:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

checkVendasStructure();
