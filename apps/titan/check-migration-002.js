#!/usr/bin/env node

/**
 * Aplica migração 002 - Adicionar logo_url e sigla
 * Usando query direta do Supabase
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas')
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
    console.log('📝 Adicionando colunas à tabela academias...')

    // Método 1: Tentar adicionar as colunas via INSERT fake (força o schema refresh)
    // Mas primeiro, vamos apenas verificar se podemos testar uma academia
    const { data: testData, error: testError } = await supabase
      .from('academias')
      .select('id, nome, sigla, logo_url')
      .limit(1)

    if (testError) {
      console.log('⚠️  Colunas ainda não existem no banco')
      console.log('❌ Erro:', testError.message)
      console.log('')
      console.log('📋 APLIQUE ESTE SQL MANUALMENTE:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('')
      console.log('ALTER TABLE academias ADD COLUMN IF NOT EXISTS sigla VARCHAR(3);')
      console.log('ALTER TABLE academias ADD COLUMN IF NOT EXISTS logo_url TEXT;')
      console.log('')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('')
      console.log('🔗 Acesse o SQL Editor:')
      console.log(`   ${supabaseUrl.replace('.supabase.co', '')}.supabase.co/project/_/sql`)
      console.log('')
      process.exit(1)
    }

    console.log('✅ Colunas verificadas com sucesso!')
    console.log('')
    if (testData && testData.length > 0) {
      console.log('📊 Exemplo de registro:')
      console.log(`   Nome: ${testData[0].nome}`)
      console.log(`   Sigla: ${testData[0].sigla || '(vazio)'}`)
      console.log(`   Logo: ${testData[0].logo_url || '(vazio)'}`)
    } else {
      console.log('ℹ️  Nenhuma academia cadastrada ainda')
    }
    console.log('')
    console.log('🎉 As colunas "sigla" e "logo_url" estão disponíveis!')
    console.log('   Agora você pode cadastrar academias com logo e sigla.')

  } catch (err) {
    console.error('❌ Erro:', err.message)
    process.exit(1)
  }
}

applyMigration()
