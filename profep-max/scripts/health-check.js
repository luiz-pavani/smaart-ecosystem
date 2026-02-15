#!/usr/bin/env node
/**
 * Sistema de Monitoramento de Saúde - PROFEP MAX
 * Verifica status geral do sistema e identifica problemas
 * 
 * Usage: node scripts/health-check.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxmrqiohfrktwlkwmfyr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function healthCheck() {
  console.log('\n🏥 HEALTH CHECK - PROFEP MAX\n');
  console.log('='.repeat(70));
  console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`);
  console.log('='.repeat(70));

  const issues = [];
  const warnings = [];

  // 1. Verificar cursos
  console.log('\n1️⃣  VERIFICANDO CURSOS...\n');
  const { data: courses } = await supabase
    .from('cursos')
    .select('id, titulo, federation_scope, gratuito');

  if (!courses || courses.length === 0) {
    issues.push('❌ CRÍTICO: Nenhum curso cadastrado no sistema');
  } else {
    console.log(`✅ Total de cursos: ${courses.length}`);
    
    const withoutScope = courses.filter(c => !c.federation_scope || c.federation_scope === '');
    if (withoutScope.length > 0) {
      warnings.push(`⚠️  ${withoutScope.length} curso(s) sem federation_scope definido`);
    }

    const notAll = courses.filter(c => c.federation_scope && c.federation_scope !== 'ALL');
    if (notAll.length > 0) {
      console.log(`   ℹ️  ${notAll.length} curso(s) com scope específico (não visíveis para todos)`);
    }
  }

  // 2. Verificar usuários ativos
  console.log('\n2️⃣  VERIFICANDO USUÁRIOS ATIVOS...\n');
  const { data: activeProfiles, count: activeCount } = await supabase
    .from('profiles')
    .select('id, email, status, plan, plan_expires_at', { count: 'exact' })
    .eq('status', 'active');

  console.log(`✅ Usuários ativos: ${activeCount || 0}`);

  if (activeProfiles && activeProfiles.length > 0) {
    // Verificar expirações próximas (7 dias)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const expiringSoon = activeProfiles.filter(p => {
      if (!p.plan_expires_at) return false;
      const expiry = new Date(p.plan_expires_at);
      return expiry <= sevenDaysFromNow && expiry > now;
    });

    if (expiringSoon.length > 0) {
      warnings.push(`⚠️  ${expiringSoon.length} assinatura(s) expirando nos próximos 7 dias`);
    }

    // Verificar usuários sem plano
    const withoutPlan = activeProfiles.filter(p => !p.plan);
    if (withoutPlan.length > 0) {
      issues.push(`❌ ${withoutPlan.length} usuário(s) ativo(s) sem plano definido`);
    }
  }

  // 3. Verificar assinaturas recorrentes
  console.log('\n3️⃣  VERIFICANDO ASSINATURAS RECORRENTES...\n');
  const { data: subs, count: subsCount } = await supabase
    .from('profiles')
    .select('id, email, id_subscription, subscription_status', { count: 'exact' })
    .not('id_subscription', 'is', null);

  console.log(`✅ Assinaturas ativas: ${subsCount || 0}`);

  if (subs && subs.length > 0) {
    const suspendedSubs = subs.filter(s => s.subscription_status === 'suspended');
    if (suspendedSubs.length > 0) {
      warnings.push(`⚠️  ${suspendedSubs.length} assinatura(s) suspensa(s) por falha de pagamento`);
    }

    const canceledSubs = subs.filter(s => s.subscription_status === 'canceled');
    if (canceledSubs.length > 0) {
      console.log(`   ℹ️  ${canceledSubs.length} assinatura(s) cancelada(s)`);
    }
  }

  // 4. Verificar eventos recentes (últimas 24h)
  console.log('\n4️⃣  VERIFICANDO EVENTOS RECENTES...\n');
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentEvents, count: eventsCount } = await supabase
    .from('subscription_events')
    .select('event_type', { count: 'exact' })
    .gte('created_at', oneDayAgo);

  if (eventsCount === 0) {
    console.log('   ℹ️  Nenhum evento de assinatura nas últimas 24h');
  } else {
    console.log(`✅ ${eventsCount} evento(s) nas últimas 24h`);
    
    if (recentEvents) {
      const byType = recentEvents.reduce((acc, e) => {
        acc[e.event_type] = (acc[e.event_type] || 0) + 1;
        return acc;
      }, {});

      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });
    }
  }

  // 5. Verificar transações recentes (últimas 24h)
  console.log('\n5️⃣  VERIFICANDO TRANSAÇÕES RECENTES...\n');
  const { data: recentSales, count: salesCount } = await supabase
    .from('vendas')
    .select('plano, valor', { count: 'exact' })
    .gte('created_at', oneDayAgo);

  if (salesCount === 0) {
    console.log('   ℹ️  Nenhuma transação nas últimas 24h');
  } else {
    console.log(`✅ ${salesCount} transação(ões) nas últimas 24h`);
    
    if (recentSales) {
      const totalValue = recentSales.reduce((sum, s) => sum + (s.valor || 0), 0);
      console.log(`   💰 Valor total: R$ ${totalValue.toFixed(2)}`);
    }
  }

  // 6. Verificar configurações de ambiente
  console.log('\n6️⃣  VERIFICANDO CONFIGURAÇÕES...\n');
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SAFE2PAY_API_TOKEN',
    'SAFE2PAY_TOKEN',
    'RESEND_API_KEY',
    'SAFE2PAY_PLAN_ID_MENSAL',
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    issues.push(`❌ CRÍTICO: ${missingVars.length} variável(is) de ambiente faltando: ${missingVars.join(', ')}`);
  } else {
    console.log('✅ Todas as variáveis de ambiente configuradas');
  }

  // RESUMO FINAL
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMO DO HEALTH CHECK');
  console.log('='.repeat(70));

  if (issues.length === 0 && warnings.length === 0) {
    console.log('\n✅ SISTEMA 100% SAUDÁVEL\n');
    console.log('   Todos os checks passaram com sucesso!');
  } else {
    if (issues.length > 0) {
      console.log('\n❌ PROBLEMAS CRÍTICOS DETECTADOS:\n');
      issues.forEach(i => console.log(i));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  AVISOS:\n');
      warnings.forEach(w => console.log(w));
    }
  }

  // Estatísticas gerais
  console.log('\n📈 ESTATÍSTICAS GERAIS:\n');
  console.log(`   👥 Usuários ativos: ${activeCount || 0}`);
  console.log(`   📚 Cursos disponíveis: ${courses?.length || 0}`);
  console.log(`   🔁 Assinaturas recorrentes: ${subsCount || 0}`);
  console.log(`   💰 Transações (24h): ${salesCount || 0}`);
  console.log(`   📡 Eventos (24h): ${eventsCount || 0}`);

  console.log('\n' + '='.repeat(70) + '\n');

  // Exit code baseado em issues
  if (issues.length > 0) {
    process.exit(1);
  }
}

healthCheck().catch(err => {
  console.error('\n💥 ERRO FATAL NO HEALTH CHECK:\n', err);
  process.exit(2);
});
