#!/usr/bin/env node
/**
 * Reverte cursos LRSJ para scope correto
 * Esses cursos devem ser visíveis APENAS para membros da federação LRSJ
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxmrqiohfrktwlkwmfyr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function revertLRSJCourses() {
  console.log('\n🔧 REVERTENDO CURSOS LRSJ PARA SCOPE CORRETO\n');
  console.log('='.repeat(60));

  // Cursos que devem ser exclusivos da federação LRSJ
  const lrsjCourses = [
    'Curso de Oficiais de Competição 2026 (Aula 1/2)',
    'Seminário de Lançamento do Processo de Graduação 2026'
  ];

  console.log('📚 Cursos para atualizar:\n');
  lrsjCourses.forEach(c => console.log(`   - ${c}`));

  console.log('\n🔄 Atualizando para federation_scope = "LRSJ"...\n');

  // Atualizar os cursos
  const { data: courses, error: selectError } = await supabase
    .from('cursos')
    .select('id, titulo')
    .in('titulo', lrsjCourses);

  if (selectError) {
    console.error('❌ Erro ao buscar cursos:', selectError.message);
    return;
  }

  if (!courses || courses.length === 0) {
    console.log('⚠️  Nenhum curso encontrado com esses títulos');
    return;
  }

  const { error: updateError } = await supabase
    .from('cursos')
    .update({ federation_scope: 'LRSJ' })
    .in('id', courses.map(c => c.id));

  if (updateError) {
    console.error('❌ Erro ao atualizar:', updateError.message);
    return;
  }

  console.log(`✅ ${courses.length} curso(s) atualizados com sucesso!`);
  console.log('\n📝 Cursos agora restritos à LRSJ:\n');
  courses.forEach(c => {
    console.log(`   ✓ ${c.titulo}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ CONCLUÍDO - Cursos LRSJ agora visíveis APENAS para membros da federação');
  console.log('='.repeat(60) + '\n');
}

revertLRSJCourses().catch(console.error);
