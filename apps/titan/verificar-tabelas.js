const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

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
