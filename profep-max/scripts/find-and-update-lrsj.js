const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findAndUpdate() {
  console.log('\n🔍 Buscando todos os cursos com "Oficiais" no título...\n');
  
  const { data: cursos, error } = await supabase
    .from('cursos')
    .select('id, titulo, federation_scope')
    .ilike('titulo', '%Oficiais%');
  
  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }
  
  console.log(`📚 Encontrados ${cursos?.length || 0} curso(s):\n`);
  
  if (!cursos || cursos.length === 0) {
    console.log('❌ Nenhum curso encontrado');
    return;
  }
  
  for (const curso of cursos) {
    console.log(`   - ${curso.titulo}`);
    console.log(`     ID: ${curso.id}`);
    console.log(`     Scope: ${curso.federation_scope}\n`);
    
    if (curso.federation_scope !== 'LRSJ') {
      console.log(`   🔄 Atualizando para LRSJ...`);
      const { error: updateError } = await supabase
        .from('cursos')
        .update({ federation_scope: 'LRSJ' })
        .eq('id', curso.id);
      
      if (updateError) {
        console.error(`   ❌ Erro ao atualizar: ${updateError.message}\n`);
      } else {
        console.log(`   ✅ Atualizado com sucesso!\n`);
      }
    } else {
      console.log(`   ✓ Já está com scope LRSJ\n`);
    }
  }
}

findAndUpdate().catch(console.error);
