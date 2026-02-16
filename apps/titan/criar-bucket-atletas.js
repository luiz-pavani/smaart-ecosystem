const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://risvafrrbnozyjquxvzi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc3ZhZnJyYm5venlqcXV4dnppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE2NDkxMywiZXhwIjoyMDg2NzQwOTEzfQ.kaZxNIQMoyY_eLgIfTJTFL8B-4hvdPJ_TDvRRW-qSPU'

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
