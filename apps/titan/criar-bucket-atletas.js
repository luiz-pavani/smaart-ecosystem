const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createBucket() {
  try {
    console.log('🗂️  Verificando bucket "atletas"...\n')
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError.message)
      return
    }
    
    const atletasBucket = buckets?.find(b => b.name === 'atletas')
    
    if (atletasBucket) {
      console.log('✅ Bucket "atletas" já existe!')
      console.log('   ID:', atletasBucket.id)
      console.log('   Public:', atletasBucket.public)
      console.log('   Created:', atletasBucket.created_at)
    } else {
      console.log('📦 Criando bucket "atletas"...')
      
      const { data, error } = await supabase.storage.createBucket('atletas', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
      })
      
      if (error) {
        console.error('❌ Erro ao criar bucket:', error.message)
        return
      }
      
      console.log('✅ Bucket "atletas" criado com sucesso!')
      console.log('   Nome:', data.name)
      console.log('   Público: Sim')
      console.log('   Limite: 10MB por arquivo')
      console.log('   Tipos aceitos: JPEG, PNG, WebP, PDF')
    }
    
    console.log('\n🎉 Sistema de atletas 100% pronto!')
    console.log('\n🔗 Próximos passos:')
    console.log('   1. Acesse: http://localhost:3000/atletas')
    console.log('   2. Cadastre o primeiro atleta')
    console.log('   3. Teste upload de fotos e certificados\n')
    
  } catch (err) {
    console.error('❌ Erro:', err.message)
  }
}

createBucket()
