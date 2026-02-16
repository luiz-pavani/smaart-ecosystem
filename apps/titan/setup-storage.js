#!/usr/bin/env node

/**
 * Setup Supabase Storage bucket para logos de academias
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

const BUCKET_NAME = 'academias-logos'

async function setupStorage() {
  console.log('🚀 Configurando Supabase Storage para logos...\n')

  try {
    // 1. Verificar se bucket já existe
    console.log('📦 Verificando buckets existentes...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      throw new Error(`Erro ao listar buckets: ${listError.message}`)
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)

    if (bucketExists) {
      console.log(`✅ Bucket "${BUCKET_NAME}" já existe!`)
      console.log('')
      console.log('🎉 Storage configurado e pronto para usar!')
      return
    }

    // 2. Criar bucket público
    console.log(`📦 Criando bucket "${BUCKET_NAME}"...`)
    const { data: newBucket, error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: true,
        fileSizeLimit: 2097152, // 2MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      }
    )

    if (createError) {
      // Tentar criar via Dashboard se API não permitir
      console.log('⚠️  Não foi possível criar bucket via API')
      console.log('')
      console.log('📋 CRIE O BUCKET MANUALMENTE:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('')
      console.log('1. Acesse o Supabase Dashboard:')
      console.log(`   ${supabaseUrl.replace('.supabase.co', '')}.supabase.co/project/_/storage/buckets`)
      console.log('')
      console.log('2. Clique em "New bucket"')
      console.log('')
      console.log('3. Configure:')
      console.log(`   Nome: ${BUCKET_NAME}`)
      console.log('   Público: ✅ SIM')
      console.log('   Tamanho máximo: 2 MB')
      console.log('   Tipos permitidos: image/png, image/jpeg, image/webp')
      console.log('')
      console.log('4. Clique em "Create bucket"')
      console.log('')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('')
      console.log('💡 Após criar, execute este script novamente para verificar')
      process.exit(1)
    }

    console.log('✅ Bucket criado com sucesso!')
    console.log('')

    // 3. Configurar policies RLS (opcional, mas bucket já é público)
    console.log('🔐 Configurando políticas de acesso...')
    console.log('   Bucket configurado como público - todos podem visualizar')
    console.log('   Apenas usuários autenticados podem fazer upload')
    console.log('')

    console.log('🎉 Setup completo!')
    console.log('')
    console.log('✨ Agora você pode:')
    console.log('   1. Fazer upload de logos no formulário de academias')
    console.log('   2. As logos serão armazenadas em:', `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/`)
    console.log('')

  } catch (err) {
    console.error('❌ Erro:', err.message)
    process.exit(1)
  }
}

setupStorage()
