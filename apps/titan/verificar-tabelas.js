const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://risvafrrbnozyjquxvzi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc3ZhZnJyYm5venlqcXV4dnppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE2NDkxMywiZXhwIjoyMDg2NzQwOTEzfQ.kaZxNIQMoyY_eLgIfTJTFL8B-4hvdPJ_TDvRRW-qSPU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  try {
    console.log('🔍 Verificando tabelas existentes...\n')
    
    // Try different possible table names
    const possibleTables = ['perfil_usuario', 'perfis', 'user_profiles', 'profiles', 'usuarios', 'user_roles']
    
    for (const tableName of possibleTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (!error) {
        console.log(`✅ Tabela encontrada: "${tableName}"`)
        if (data && data.length > 0) {
          console.log('   Colunas:', Object.keys(data[0]).join(', '))
        }
      }
    }
    
    // Check for federacoes and academias
    console.log('\n📊 Verificando tabelas principais:\n')
    
    const mainTables = ['federacoes', 'academias', 'certificados', 'anualidade_config']
    for (const tableName of mainTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (!error) {
        console.log(`✅ ${tableName}`)
      } else {
        console.log(`❌ ${tableName}`)
      }
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

checkTables()
