const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://risvafrrbnozyjquxvzi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc3ZhZnJyYm5venlqcXV4dnppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE2NDkxMywiZXhwIjoyMDg2NzQwOTEzfQ.kaZxNIQMoyY_eLgIfTJTFL8B-4hvdPJ_TDvRRW-qSPU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable() {
  try {
    console.log('🔍 Verificando se a tabela "atletas" existe...\n')
    
    const { data, error } = await supabase
      .from('atletas')
      .select('id')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Tabela "atletas" NÃO existe')
        console.log('➡️  Você precisa aplicar a migration no SQL Editor do Supabase')
        console.log('➡️  Link: https://supabase.com/dashboard/project/risvafrrbnozyjquxvzi/sql/new\n')
      } else {
        console.error('❌ Erro ao verificar tabela:', error.message)
      }
      return false
    }
    
    console.log('✅ Tabela "atletas" JÁ EXISTE!')
    console.log('✅ Sistema pronto para cadastrar atletas!')
    console.log('\n🎯 Próximo passo:')
    console.log('   1. Criar bucket "atletas" no Supabase Storage (se não existir)')
    console.log('   2. Acessar http://localhost:3000/atletas para testar\n')
    return true
    
  } catch (err) {
    console.error('❌ Erro:', err.message)
    return false
  }
}

checkTable()
