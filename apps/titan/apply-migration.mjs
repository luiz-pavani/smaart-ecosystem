#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configuração do Supabase
const supabaseUrl = 'https://risvafrrbnozyjquxvzi.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc3ZhZnJyYm5venlqcXV4dnppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE2NDkxMywiZXhwIjoyMDg2NzQwOTEzfQ.kaZxNIQMoyY_eLgIfTJTFL8B-4hvdPJ_TDvRRW-qSPU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'public'
  }
})

async function applyMigration() {
  try {
    console.log('🚀 Aplicando Migration 008: Cadastro Master de Atletas...\n')
    
    // Ler o arquivo SQL
    const migrationPath = join(__dirname, 'supabase', 'migrations', '008_atletas_schema_master.sql')
    const sqlContent = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Arquivo SQL carregado com sucesso')
    console.log(`📊 Tamanho: ${sqlContent.length} caracteres\n`)
    
    // Executar a migration via RPC (usando SQL direto)
    // Como o supabase-js não tem método direto para executar SQL arbitrário,
    // vamos usar fetch para chamar a API REST diretamente
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sqlContent })
    })
    
    if (!response.ok) {
      // Se exec_sql não existir, vamos tentar outra abordagem
      console.log('⚠️  Método exec_sql não disponível, tentando abordagem alternativa...\n')
      
      // Dividir o SQL em statements individuais e executar via supabase-js
      // Para isso, vamos quebrar por comandos principais
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      console.log(`📝 Executando ${statements.length} comandos SQL...\n`)
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]
        if (stmt.length < 10) continue // Skip empty or very short statements
        
        console.log(`▶️  Comando ${i + 1}/${statements.length}`)
        
        try {
          // Usar query direta via fetch ao endpoint do PostgREST
          const execResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({ sql: stmt + ';' })
          })
          
          if (!execResponse.ok && !execResponse.status === 404) {
            console.log(`⚠️  Aviso no comando ${i + 1}: ${await execResponse.text()}`)
          } else {
            console.log(`✅ Comando ${i + 1} executado`)
          }
        } catch (err) {
          console.log(`⚠️  Aviso no comando ${i + 1}: ${err.message}`)
          continue
        }
      }
      
      console.log('\n⚠️  Execução via API REST não é ideal. Use o SQL Editor do Supabase Dashboard.')
      console.log('\n📋 INSTRUÇÕES:')
      console.log('1. Acesse: https://supabase.com/dashboard/project/risvafrrbnozyjquxvzi/sql/new')
      console.log('2. Cole o conteúdo de: supabase/migrations/008_atletas_schema_master.sql')
      console.log('3. Clique em "Run" (Ctrl+Enter)')
      console.log('\n✅ A migration usa "IF NOT EXISTS" então é seguro executar múltiplas vezes')
      
      return
    }
    
    const result = await response.json()
    console.log('✅ Migration 008 aplicada com sucesso!\n')
    console.log('📊 Resultado:', JSON.stringify(result, null, 2))
    
  } catch (error) {
    console.error('\n❌ Erro ao aplicar migration:', error.message)
    console.error('\n🔍 Stack:', error.stack)
    
    console.log('\n📋 SOLUÇÃO ALTERNATIVA:')
    console.log('Execute manualmente via Supabase Dashboard SQL Editor:')
    console.log('https://supabase.com/dashboard/project/risvafrrbnozyjquxvzi/sql/new')
    
    process.exit(1)
  }
}

// Executar
console.log('═══════════════════════════════════════════════════════════')
console.log('   MIGRATION 008: CADASTRO MASTER DE ATLETAS')
console.log('═══════════════════════════════════════════════════════════\n')

applyMigration()
