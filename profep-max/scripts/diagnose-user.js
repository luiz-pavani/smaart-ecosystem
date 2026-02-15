#!/usr/bin/env node
/**
 * Diagnóstico completo do usuário e sistema de cursos
 * Usage: node scripts/diagnose-user.js ricolima2@gmail.com
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxmrqiohfrktwlkwmfyr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnose(email) {
  console.log('\n🔍 DIAGNÓSTICO PROFEP MAX\n');
  console.log('='.repeat(60));
  console.log(`📧 Email: ${email}`);
  console.log('='.repeat(60));

  // 1. Verificar perfil do usuário
  console.log('\n1️⃣  VERIFICANDO PERFIL DO USUÁRIO...\n');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email)
    .single();

  if (profileError) {
    console.error('❌ Erro ao buscar perfil:', profileError.message);
    return;
  }

  if (!profile) {
    console.error('❌ Usuário não encontrado');
    return;
  }

  console.log('✅ Perfil encontrado:');
  console.log(`   ID: ${profile.id}`);
  console.log(`   Nome: ${profile.full_name}`);
  console.log(`   Status: ${profile.status} ${profile.status === 'active' ? '✅' : '❌'}`);
  console.log(`   Plano: ${profile.plan || 'N/A'}`);
  console.log(`   Expira em: ${profile.plan_expires_at || 'N/A'}`);
  console.log(`   Subscription Status: ${profile.subscription_status || 'N/A'}`);
  console.log(`   ID Subscription: ${profile.id_subscription || 'N/A'}`);

  // 2. Verificar entity_membership
  console.log('\n2️⃣  VERIFICANDO FILIAÇÃO A FEDERAÇÃO...\n');
  const { data: membership } = await supabase
    .from('entity_memberships')
    .select('*, entities:entity_id (slug, name)')
    .eq('profile_id', profile.id);

  if (membership && membership.length > 0) {
    console.log(`✅ Usuário tem ${membership.length} filiação(ões):`);
    membership.forEach(m => {
      const entity = Array.isArray(m.entities) ? m.entities[0] : m.entities;
      console.log(`   - ${entity?.name || 'N/A'} (${entity?.slug || 'N/A'})`);
    });
  } else {
    console.log('ℹ️  Usuário não tem filiação a federações (assinante comum)');
  }

  // 3. Verificar cursos disponíveis
  console.log('\n3️⃣  VERIFICANDO CURSOS DISPONÍVEIS...\n');
  const { data: allCourses } = await supabase
    .from('cursos')
    .select('id, titulo, categoria, federation_scope, gratuito')
    .order('titulo');

  if (!allCourses || allCourses.length === 0) {
    console.log('❌ NENHUM CURSO CADASTRADO NO SISTEMA!');
    console.log('   Acesse: https://www.profepmax.com.br/admin/conteudo');
    console.log('   E cadastre cursos com federation_scope = "ALL"');
  } else {
    console.log(`✅ Total de cursos no sistema: ${allCourses.length}\n`);
    
    // Agrupar por federation_scope
    const byScope = allCourses.reduce((acc, c) => {
      const scope = c.federation_scope || 'ALL';
      if (!acc[scope]) acc[scope] = [];
      acc[scope].push(c);
      return acc;
    }, {});

    Object.keys(byScope).forEach(scope => {
      const count = byScope[scope].length;
      const icon = scope === 'ALL' || !scope ? '🌍' : '🏢';
      console.log(`   ${icon} ${scope || 'ALL'}: ${count} curso(s)`);
    });

    // Cursos que o usuário pode ver
    const memberTag = membership && membership.length > 0 
      ? (Array.isArray(membership[0].entities) ? membership[0].entities[0]?.slug : membership[0].entities?.slug)?.toUpperCase()
      : null;

    const visibleCourses = allCourses.filter(curso => {
      const scope = String(curso.federation_scope || 'ALL').trim().toUpperCase();
      if (!scope || scope === '' || scope === 'ALL') return true;
      if (memberTag && scope === memberTag) return true;
      return false;
    });

    console.log(`\n✅ Cursos visíveis para ${email}: ${visibleCourses.length}`);
    
    if (visibleCourses.length === 0) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
      console.log('   O usuário não pode ver nenhum curso!');
      console.log('   Solução: Configure cursos com federation_scope = "ALL"');
    } else {
      // Agrupar por categoria
      const byCategory = visibleCourses.reduce((acc, c) => {
        const cat = c.categoria || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(c);
        return acc;
      }, {});

      console.log('\n   Por categoria:');
      Object.keys(byCategory).forEach(cat => {
        console.log(`   - ${cat}: ${byCategory[cat].length} curso(s)`);
      });
    }
  }

  // 4. Verificar transações/vendas
  console.log('\n4️⃣  VERIFICANDO HISTÓRICO DE PAGAMENTOS...\n');
  const { data: transactions } = await supabase
    .from('vendas')
    .select('id, created_at, plano, valor, metodo, subscription_id, cycle_number')
    .ilike('email', email)
    .order('created_at', { ascending: false })
    .limit(5);

  if (transactions && transactions.length > 0) {
    console.log(`✅ Últimas ${transactions.length} transações:`);
    transactions.forEach(t => {
      console.log(`   - ${new Date(t.created_at).toLocaleDateString('pt-BR')}: ${t.plano} - R$ ${t.valor}`);
      if (t.subscription_id) {
        console.log(`     Subscription ID: ${t.subscription_id} (Ciclo ${t.cycle_number || 1})`);
      }
    });
  } else {
    console.log('ℹ️  Nenhuma transação encontrada');
  }

  // 5. Verificar subscription_events
  console.log('\n5️⃣  VERIFICANDO EVENTOS DE ASSINATURA...\n');
  if (profile.id_subscription) {
    const { data: events } = await supabase
      .from('subscription_events')
      .select('event_type, created_at, status_code')
      .eq('subscription_id', profile.id_subscription)
      .order('created_at', { ascending: false })
      .limit(5);

    if (events && events.length > 0) {
      console.log(`✅ Últimos ${events.length} eventos:`);
      events.forEach(e => {
        console.log(`   - ${e.event_type} (${new Date(e.created_at).toLocaleDateString('pt-BR')})`);
      });
    } else {
      console.log('ℹ️  Nenhum evento de assinatura registrado');
    }
  } else {
    console.log('ℹ️  Usuário não tem ID de assinatura registrado');
  }

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DO DIAGNÓSTICO');
  console.log('='.repeat(60));
  
  const issues = [];
  const fixes = [];

  if (profile.status !== 'active') {
    issues.push('⚠️  Status do perfil não está ACTIVE');
    fixes.push('- Ativar perfil manualmente ou processar pagamento');
  }

  if (!profile.plan) {
    issues.push('⚠️  Plano não definido');
    fixes.push('- Definir plano (mensal/anual/vitalicio)');
  }

  if (allCourses && allCourses.length === 0) {
    issues.push('❌ NENHUM CURSO NO SISTEMA');
    fixes.push('- Cadastrar cursos em /admin/conteudo');
  }

  const visibleCourses = allCourses ? allCourses.filter(curso => {
    const scope = String(curso.federation_scope || 'ALL').trim().toUpperCase();
    const memberTag = membership && membership.length > 0 
      ? (Array.isArray(membership[0].entities) ? membership[0].entities[0]?.slug : membership[0].entities?.slug)?.toUpperCase()
      : null;
    if (!scope || scope === '' || scope === 'ALL') return true;
    if (memberTag && scope === memberTag) return true;
    return false;
  }) : [];

  if (allCourses && allCourses.length > 0 && visibleCourses.length === 0) {
    issues.push('❌ Usuário não pode ver nenhum curso');
    fixes.push('- Configurar cursos com federation_scope = "ALL"');
  }

  if (issues.length === 0) {
    console.log('\n✅ SISTEMA OK - Nenhum problema detectado!');
  } else {
    console.log('\n⚠️  PROBLEMAS DETECTADOS:\n');
    issues.forEach(i => console.log(i));
    console.log('\n💡 SOLUÇÕES:\n');
    fixes.forEach(f => console.log(f));
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/diagnose-user.js <email>');
  process.exit(1);
}

diagnose(email).catch(console.error);
