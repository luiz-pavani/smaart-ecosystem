#!/usr/bin/env node
/**
 * Script para configurar TODOS os cursos com federation_scope = ALL
 * Isso garante que todos os assinantes vejam todos os cursos
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxmrqiohfrktwlkwmfyr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixCourseScopes() {
  console.log('\n🔧 CORRIGINDO FEDERATION_SCOPE DOS CURSOS\n');
  console.log('='.repeat(60));

  // 1. Buscar todos os cursos
  const { data: courses, error } = await supabase
    .from('cursos')
    .select('id, titulo, federation_scope');

  if (error) {
    console.error('❌ Erro ao buscar cursos:', error.message);
    return;
  }

  if (!courses || courses.length === 0) {
    console.log('ℹ️  Nenhum curso encontrado no sistema');
    return;
  }

  console.log(`📚 Total de cursos: ${courses.length}\n`);

  // 2. Identificar cursos que precisam correção
  const needsFix = courses.filter(c => {
    const scope = c.federation_scope;
    return scope === null || scope === '' || scope !== 'ALL';
  });

  if (needsFix.length === 0) {
    console.log('✅ Todos os cursos já estão com federation_scope = "ALL"');
    return;
  }

  console.log(`⚠️  ${needsFix.length} curso(s) precisam de correção:\n`);
  needsFix.forEach(c => {
    console.log(`   - ${c.titulo} (scope atual: ${c.federation_scope || 'null'})`);
  });

  console.log('\n🔄 Atualizando...\n');

  // 3. Atualizar todos de uma vez
  const { error: updateError } = await supabase
    .from('cursos')
    .update({ federation_scope: 'ALL' })
    .in('id', needsFix.map(c => c.id));

  if (updateError) {
    console.error('❌ Erro ao atualizar:', updateError.message);
    return;
  }

  console.log(`✅ ${needsFix.length} curso(s) atualizados com sucesso!`);
  console.log('\n📝 Cursos atualizados:\n');
  needsFix.forEach(c => {
    console.log(`   ✓ ${c.titulo}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ CONCLUÍDO - Todos os cursos agora são visíveis para todos os assinantes');
  console.log('='.repeat(60) + '\n');
}

fixCourseScopes().catch(console.error);
