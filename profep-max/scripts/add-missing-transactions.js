#!/usr/bin/env node

/**
 * Script para adicionar transações faltantes baseado em profiles ativos
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addMissingTransactions() {
  console.log('\n➕ ADICIONANDO TRANSAÇÕES FALTANTES\n');
  console.log('='.repeat(70));
  
  // Buscar profiles ativos
  const { data: activeProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('email, plan, status, id_subscription, plan_expires_at, created_at, full_name')
    .eq('status', 'active')
    .not('plan', 'is', null)
    .order('email');
  
  if (profileError) {
    console.error('❌ Erro:', profileError.message);
    return;
  }
  
  // Buscar vendas existentes
  const { data: existingVendas } = await supabase
    .from('vendas')
    .select('email');
  
  const existingEmails = new Set(existingVendas?.map(v => v.email) || []);
  
  // Identificar profiles sem venda
  const missingProfiles = activeProfiles.filter(p => 
    !existingEmails.has(p.email) && 
    p.plan !== 'free' && // Ignorar planos free
    p.email !== 'luizpavani@gmail.com' // Admin
  );
  
  console.log(`\nProfiles sem transação: ${missingProfiles.length}\n`);
  
  if (missingProfiles.length === 0) {
    console.log('✅ Todas as transações já estão registradas!');
    return;
  }
  
  // Adicionar transações
  for (const profile of missingProfiles) {
    const planoNome = profile.plan === 'mensal' ? 'Plano Mensal' : 
                      profile.plan === 'anual' ? 'Plano Anual' : 
                      profile.plan;
    
    // Valor baseado no plano
    const valor = profile.plan === 'mensal' ? 24.90 : 
                  profile.plan === 'anual' ? 249.90 : 
                  24.90;
    
    // Data baseada no created_at ou expiry
    const dataVenda = profile.created_at ? new Date(profile.created_at) : 
                      profile.plan_expires_at ? new Date(new Date(profile.plan_expires_at).getTime() - 30 * 24 * 60 * 60 * 1000) :
                      new Date();
    
    const vendaData = {
      email: profile.email,
      plano: planoNome,
      metodo: 'cartao',
      valor: valor,
      status: 'pago',
      transaction_id: profile.id_subscription || `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      subscription_id: profile.id_subscription,
      cycle_number: 1,
      created_at: dataVenda.toISOString()
    };
    
    console.log(`Adicionando: ${profile.email} | ${planoNome} | R$ ${valor} | ${dataVenda.toLocaleDateString('pt-BR')}`);
    
    const { error: insertError } = await supabase
      .from('vendas')
      .insert([vendaData]);
    
    if (insertError) {
      console.error(`  ❌ Erro: ${insertError.message}`);
    } else {
      console.log('  ✅ Adicionado com sucesso');
    }
  }
  
  // Verificação final
  console.log('\n' + '='.repeat(70));
  console.log('📊 VERIFICAÇÃO FINAL\n');
  
  const { data: allVendas } = await supabase
    .from('vendas')
    .select('*')
    .order('created_at', { ascending: false });
  
  console.log(`Total de vendas: ${allVendas.length}`);
  
  let totalReceita = 0;
  allVendas.forEach(v => {
    const valor = parseFloat(v.valor) || 0;
    totalReceita += valor;
  });
  
  console.log(`Receita total: R$ ${totalReceita.toFixed(2)}`);
  console.log('='.repeat(70) + '\n');
}

addMissingTransactions().catch(console.error);
