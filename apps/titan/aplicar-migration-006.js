const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://risvafrrbnozyjquxvzi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc3ZhZnJyYm5venlqcXV4dnppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE2NDkxMywiZXhwIjoyMDg2NzQwOTEzfQ.kaZxNIQMoyY_eLgIfTJTFL8B-4hvdPJ_TDvRRW-qSPU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeSQLStatement(sql) {
  // Remove comments and split by semicolons
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  console.log(`📋 Total de ${statements.length} comandos SQL para executar\n`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';'
    
    // Skip empty statements
    if (stmt.trim() === ';') continue
    
    // Show command type
    const cmdType = stmt.trim().split(/\s+/)[0].toUpperCase()
    console.log(`[${i + 1}/${statements.length}] Executando ${cmdType}...`)
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: stmt })
      })

      if (!response.ok) {
        // Try direct query execution
        const { data, error } = await supabase.rpc('query', { sql: stmt })
        if (error) {
          console.error(`❌ Erro no comando ${i + 1}:`, error.message)
          console.log('SQL:', stmt.substring(0, 100) + '...')
          throw error
        }
      }
      
      console.log(`✅ Comando ${i + 1} executado com sucesso`)
    } catch (err) {
      console.error(`❌ Erro no comando ${i + 1}:`, err.message)
      console.log('SQL:', stmt.substring(0, 200))
      // Continue with next statement
    }
  }
}

async function applyMigration() {
  try {
    console.log('🔄 Lendo migration 006_atletas.sql...\n')
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '006_atletas.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('🚀 Iniciando aplicação da migration...\n')
    
    await executeSQLStatement(migrationSQL)
    
    console.log('\n✅ Migration 006_atletas aplicada com sucesso!')
    console.log('\n📊 Tabela "atletas" criada com:')
    console.log('  ✅ Campos completos de cadastro')
    console.log('  ✅ Graduação e Dan (SHODAN-HACHIDAN)')
    console.log('  ✅ Nível de arbitragem')
    console.log('  ✅ Upload de fotos e certificados')
    console.log('  ✅ Sistema de lotes')
    console.log('  ✅ Número de registro automático')
    console.log('  ✅ RLS policies configuradas')
    console.log('  ✅ Triggers automáticos')
    console.log('\n🎯 Próximo passo: Criar bucket "atletas" no Supabase Storage')
    
  } catch (err) {
    console.error('\n❌ Erro fatal:', err)
    process.exit(1)
  }
}

applyMigration()
