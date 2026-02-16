#!/usr/bin/env node

/**
 * Aplica migração 002 - Adicionar logo_url e sigla
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas')
  console.error('Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🚀 Aplicando migração 002...\n')

  try {
    // Ler arquivo SQL
    const sqlPath = './supabase/migrations/002_add_logo_sigla.sql'
    console.log('📄 Lendo arquivo:', sqlPath)
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Arquivo não encontrado: ${sqlPath}`)
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8')
    console.log('📝 SQL a ser executado:')
    console.log('---')
    console.log(sql)
    console.log('---\n')

    // Executar SQL
    console.log('⚡ Executando no Supabase...')
    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      // Se exec_sql não existir, tentar método alternativo
      console.log('⚠️  RPC exec_sql não disponível, use o método manual:')
      console.log('')
      console.log('1. Acesse o Supabase Dashboard:')
      console.log(`   ${supabaseUrl.replace('.supabase.co', '')}/editor`)
      console.log('')
      console.log('2. Clique em "New Query"')
      console.log('')
      console.log('3. Cole e execute o SQL acima')
      console.log('')
      throw error
    }

    console.log('✅ Migração aplicada com sucesso!')
    console.log('')
    console.log('Os seguintes campos foram adicionados à tabela academias:')
    console.log('  • sigla (VARCHAR(3)) - Sigla de 3 letras')
    console.log('  • logo_url (TEXT) - URL da logo da academia')
    console.log('')
    console.log('🎉 Pronto! Você já pode usar esses campos no cadastro.')

  } catch (err) {
    console.error('❌ Erro ao aplicar migração:', err.message)
    console.log('')
    console.log('💡 Aplique manualmente via Supabase Dashboard:')
    console.log(`   1. Acesse: ${supabaseUrl}/project/_/sql`)
    console.log('   2. Execute o SQL do arquivo: supabase/migrations/002_add_logo_sigla.sql')
    process.exit(1)
  }
}

applyMigration()
