#!/usr/bin/env node
/**
 * Script simplificado para atualizar cursos LRSJ
 * Usa require com .env.local diretamente
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCourses() {
  console.log('\n🔧 ATUALIZANDO CURSOS LRSJ\n');
  
  // Buscar cursos que contém "Oficiais" ou "Lançamento"
  const { data: cursos, error } = await supabase
    .from('cursos')
    .select('id, titulo, federation_scope')
    .or('titulo.ilike.%Oficiais de Competição 2026%,titulo.ilike.%Lançamento do Processo de Graduação 2026%');
  
  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }
  
  if (!cursos || cursos.length === 0) {
    console.log('ℹ️  Nenhum curso encontrado');
    return;
  }
  
  console.log(`📚 Encontrados ${cursos.length} curso(s):\n`);
  
  for (const curso of cursos) {
    console.log(`${curso.titulo}`);
    console.log(`   Scope atual: ${curso.federation_scope}`);
    
    if (curso.federation_scope !== 'LRSJ') {
      const { error: updateError } = await supabase
        .from('cursos')
        .update({ federation_scope: 'LRSJ' })
        .eq('id', curso.id);
      
      if (updateError) {
        console.error(`   ❌ Erro: ${updateError.message}`);
      } else {
        console.log(`   ✅ Atualizado para LRSJ`);
      }
    } else {
      console.log(`   ✓ Já está LRSJ`);
    }
    console.log();
  }
  
  console.log('✅ Concluído!\n');
}

updateCourses().catch(console.error);
