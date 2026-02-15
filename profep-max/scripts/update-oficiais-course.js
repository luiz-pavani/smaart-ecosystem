const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function update() {
  console.log('\n🔧 Atualizando Curso de Oficiais para LRSJ...\n');
  
  // Primeiro, pegar o ID exato
  const { data: cursos, error: selectError } = await supabase
    .from('cursos')
    .select('id, titulo, federation_scope')
    .eq('titulo', 'Curso de Oficiais de Competição 2026 (Aula 1/2)');
  
  if (selectError || !cursos || cursos.length === 0) {
    console.log('❌ Curso não encontrado:', selectError?.message);
    return;
  }
  
  const curso = cursos[0];
  
  console.log('📋 Curso encontrado:');
  console.log(`   ID: ${curso.id}`);
  console.log(`   Título: ${curso.titulo}`);
  console.log(`   Scope atual: ${curso.federation_scope}\n`);
  
  // Atualizar pelo ID
  const { data, error } = await supabase
    .from('cursos')
    .update({ federation_scope: 'LRSJ' })
    .eq('id', curso.id)
    .select();
  
  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log('✅ Atualizado com sucesso!');
    console.log(`   Novo scope: ${data[0]?.federation_scope}\n`);
  }
}

update().catch(console.error);
