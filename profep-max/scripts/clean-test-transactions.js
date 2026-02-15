#!/usr/bin/env node

/**
 * Script para limpar transações de teste e verificar transações reais
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanTestTransactions() {
  console.log('\n🧹 LIMPEZA DE TRANSAÇÕES DE TESTE\n');
  console.log('='.repeat(70));
  
  // 1. Listar todas as vendas atuais
  console.log('\n1️⃣  Listando todas as vendas...\n');
  const { data: allVendas, error: listError } = await supabase
    .from('vendas')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (listError) {
    console.error('❌ Erro ao listar vendas:', listError.message);
    return;
  }
  
  console.log(`Total de vendas: ${allVendas.length}`);
  console.log('');
  
  // Mostrar todas
  allVendas.forEach(v => {
    console.log(`${v.email} | ${v.plano} | R$ ${v.valor} | ${new Date(v.created_at).toLocaleDateString('pt-BR')}`);
  });
  
  // 2. Identificar transações de teste
  console.log('\n2️⃣  Identificando transações de teste...\n');
  
  const testEmails = [
    'me@masteresportes.com',
    'secretaria@lrsj.com.br',
    'finally-works@profepmax.com',
    'webhook-test-now@profepmax.com',
    'rls-test@profepmax.com',
    'success-test@profepmax.com',
    'test-rls@profepmax.com',
    'final-test@profepmax.com',
    'debug-vendas@profepmax.com',
    'teste-fix@profepmax.com',
    'diag-auto@profepmax.com',
    'teste-webhook@profepmax.com',
    'luizpavani@me.com'
  ];
  
  // Também remover emails que começam com "teste-recorrencia"
  const testVendas = allVendas.filter(v => 
    testEmails.includes(v.email) || 
    v.email.startsWith('teste-recorrencia-') ||
    v.email.includes('@example.com')
  );
  
  console.log(`Transações de teste encontradas: ${testVendas.length}`);
  console.log('');
  testVendas.forEach(v => {
    console.log(`🗑️  ${v.email} | ${v.plano} | R$ ${v.valor}`);
  });
  
  // 3. Deletar transações de teste
  console.log('\n3️⃣  Deletando transações de teste...\n');
  
  for (const email of testEmails) {
    const { error: deleteError } = await supabase
      .from('vendas')
      .delete()
      .eq('email', email);
    
    if (deleteError) {
      console.error(`❌ Erro ao deletar ${email}:`, deleteError.message);
    } else {
      console.log(`✅ Deletado: ${email}`);
    }
  }
  
  // Deletar emails que começam com teste-recorrencia
  const { error: deleteRecError } = await supabase
    .from('vendas')
    .delete()
    .like('email', 'teste-recorrencia-%');
  
  if (deleteRecError) {
    console.error('❌ Erro ao deletar teste-recorrencia:', deleteRecError.message);
  } else {
    console.log('✅ Deletados: teste-recorrencia-*');
  }
  
  // Deletar emails @example.com
  const { error: deleteExampleError } = await supabase
    .from('vendas')
    .delete()
    .like('email', '%@example.com%');
  
  if (deleteExampleError) {
    console.error('❌ Erro ao deletar @example.com:', deleteExampleError.message);
  } else {
    console.log('✅ Deletados: *@example.com');
  }
  
  // 4. Listar vendas restantes (reais)
  console.log('\n4️⃣  Vendas reais restantes...\n');
  const { data: realVendas, error: realError } = await supabase
    .from('vendas')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (realError) {
    console.error('❌ Erro:', realError.message);
    return;
  }
  
  console.log(`Total de vendas reais: ${realVendas.length}`);
  console.log('');
  
  let totalReceita = 0;
  realVendas.forEach(v => {
    const valor = parseFloat(v.valor) || 0;
    totalReceita += valor;
    console.log(`✅ ${v.email} | ${v.plano} | R$ ${valor.toFixed(2)} | ${new Date(v.created_at).toLocaleDateString('pt-BR')}`);
  });
  
  // 5. Verificar profiles com assinatura ativa
  console.log('\n5️⃣  Verificando profiles com assinatura ativa...\n');
  const { data: activeProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('email, plan, status, id_subscription, plan_expires_at')
    .eq('status', 'active')
    .not('plan', 'is', null)
    .order('email');
  
  if (profileError) {
    console.error('❌ Erro:', profileError.message);
  } else {
    console.log(`Profiles ativos: ${activeProfiles.length}`);
    console.log('');
    
    for (const profile of activeProfiles) {
      // Verificar se tem venda correspondente
      const temVenda = realVendas.some(v => v.email === profile.email);
      const status = temVenda ? '✅' : '⚠️  FALTANDO';
      console.log(`${status} ${profile.email} | ${profile.plan} | Expira: ${profile.plan_expires_at ? new Date(profile.plan_expires_at).toLocaleDateString('pt-BR') : 'N/A'}`);
    }
  }
  
  // RESUMO
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMO');
  console.log('='.repeat(70));
  console.log(`Transações deletadas: ${testVendas.length}`);
  console.log(`Transações reais: ${realVendas.length}`);
  console.log(`Receita total: R$ ${totalReceita.toFixed(2)}`);
  console.log(`Profiles ativos: ${activeProfiles?.length || 0}`);
  console.log('='.repeat(70) + '\n');
}

cleanTestTransactions().catch(console.error);
