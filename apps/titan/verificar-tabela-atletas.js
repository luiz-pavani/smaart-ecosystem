const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const projectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0]
  } catch {
    return '<project-ref>'
  }
})()
const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`

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
        console.log(`➡️  Link: ${sqlEditorUrl}\n`)
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
