#!/usr/bin/env node

/**
 * Relatório financeiro completo da plataforma
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function financialReport() {
  console.log('\n💰 RELATÓRIO FINANCEIRO PROFEP MAX\n');
  console.log('='.repeat(80));
  
  // 1. Vendas
  const { data: vendas } = await supabase
    .from('vendas')
    .select('*')
    .order('created_at', { ascending: false });
  
  console.log('\n📊 VENDAS\n');
  console.log(`Total de transações: ${vendas.length}`);
  
  let totalReceita = 0;
  let receitaMensal = 0;
  let receitaAnual = 0;
  
  const vendasPorMes = {};
  
  vendas.forEach(v => {
    const valor = parseFloat(v.valor) || 0;
    totalReceita += valor;
    
    if (v.plano?.toLowerCase().includes('mensal')) {
      receitaMensal += valor;
    } else if (v.plano?.toLowerCase().includes('anual')) {
      receitaAnual += valor;
    }
    
    const mes = new Date(v.created_at).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
    vendasPorMes[mes] = (vendasPorMes[mes] || 0) + valor;
  });
  
  console.log(`\nReceita Total: R$ ${totalReceita.toFixed(2)}`);
  console.log(`  - Planos Mensais: R$ ${receitaMensal.toFixed(2)}`);
  console.log(`  - Planos Anuais: R$ ${receitaAnual.toFixed(2)}`);
  
  console.log('\nReceita por Mês:');
  Object.entries(vendasPorMes)
    .sort()
    .forEach(([mes, valor]) => {
      console.log(`  ${mes}: R$ ${valor.toFixed(2)}`);
    });
  
  // 2. Assinantes Ativos
  const { data: activeProfiles } = await supabase
    .from('profiles')
    .select('email, plan, status, plan_expires_at')
    .eq('status', 'active')
    .not('plan', 'is', null)
    .neq('plan', 'free');
  
  console.log('\n👥 ASSINANTES ATIVOS\n');
  console.log(`Total: ${activeProfiles.length} assinantes pagantes`);
  
  const porPlano = {
    mensal: 0,
    anual: 0
  };
  
  activeProfiles.forEach(p => {
    if (p.plan === 'mensal') porPlano.mensal++;
    else if (p.plan === 'anual') porPlano.anual++;
  });
  
  console.log(`  - Plano Mensal: ${porPlano.mensal} assinantes`);
  console.log(`  - Plano Anual: ${porPlano.anual} assinantes`);
  
  // MRR (Monthly Recurring Revenue)
  const mrr = porPlano.mensal * 24.90 + (porPlano.anual * 249.90 / 12);
  console.log(`\n💵 MRR (Receita Recorrente Mensal): R$ ${mrr.toFixed(2)}`);
  console.log(`💵 ARR (Receita Recorrente Anual): R$ ${(mrr * 12).toFixed(2)}`);
  
  // 3. Próximas Renovações
  console.log('\n📅 PRÓXIMAS RENOVAÇÕES (próximos 30 dias)\n');
  
  const hoje = new Date();
  const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const renovacoes = activeProfiles
    .filter(p => {
      if (!p.plan_expires_at) return false;
      const expiry = new Date(p.plan_expires_at);
      return expiry >= hoje && expiry <= em30dias;
    })
    .sort((a, b) => new Date(a.plan_expires_at) - new Date(b.plan_expires_at));
  
  if (renovacoes.length === 0) {
    console.log('Nenhuma renovação programada para os próximos 30 dias');
  } else {
    renovacoes.forEach(p => {
      const expiry = new Date(p.plan_expires_at);
      const dias = Math.ceil((expiry - hoje) / (1000 * 60 * 60 * 24));
      const valor = p.plan === 'mensal' ? 24.90 : 249.90;
      console.log(`  ${p.email} | ${p.plan} | R$ ${valor.toFixed(2)} | Expira em ${dias} dias (${expiry.toLocaleDateString('pt-BR')})`);
    });
    
    const receitaRenovacao = renovacoes.reduce((sum, p) => {
      return sum + (p.plan === 'mensal' ? 24.90 : 249.90);
    }, 0);
    
    console.log(`\n  Total esperado em renovações: R$ ${receitaRenovacao.toFixed(2)}`);
  }
  
  // 4. Lista de transações
  console.log('\n📋 LISTA DE TRANSAÇÕES\n');
  console.log('Email'.padEnd(40) + 'Plano'.padEnd(20) + 'Valor'.padEnd(15) + 'Data');
  console.log('-'.repeat(80));
  
  vendas.forEach(v => {
    const email = v.email.substring(0, 37) + (v.email.length > 37 ? '...' : '');
    const plano = (v.plano || '').substring(0, 17) + ((v.plano || '').length > 17 ? '...' : '');
    const valor = `R$ ${parseFloat(v.valor).toFixed(2)}`;
    const data = new Date(v.created_at).toLocaleDateString('pt-BR');
    
    console.log(email.padEnd(40) + plano.padEnd(20) + valor.padEnd(15) + data);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ RELATÓRIO CONCLUÍDO');
  console.log('='.repeat(80) + '\n');
}

financialReport().catch(console.error);
