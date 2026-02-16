#!/usr/bin/env node

/**
 * Aplica políticas RLS para Storage - bucket academias-logos
 */

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

console.log('🔐 Configurando políticas de segurança para Storage...\n')
console.log('⚠️  As políticas de Storage devem ser criadas no Supabase Dashboard.\n')
console.log('📋 SIGA ESTES PASSOS:\n')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
console.log('1. Acesse o Supabase Storage Policies:')
console.log(`   ${supabaseUrl.replace('.supabase.co', '')}.supabase.co/project/_/storage/policies\n`)
console.log('2. Selecione o bucket: academias-logos\n')
console.log('3. Clique em "New Policy"\n')
console.log('4. Crie 4 políticas (ou use o SQL Editor):\n')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
console.log('\n📝 OPÇÃO RÁPIDA - Copie e cole este SQL no SQL Editor:\n')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const sql = `
-- Permitir upload para usuários autenticados
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'academias-logos');

-- Permitir visualização pública
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'academias-logos');

-- Permitir atualização para usuários autenticados
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'academias-logos')
WITH CHECK (bucket_id = 'academias-logos');

-- Permitir deleção para usuários autenticados
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'academias-logos');
`

console.log(sql)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
console.log('5. Acesse o SQL Editor:')
console.log(`   ${supabaseUrl.replace('.supabase.co', '')}.supabase.co/project/_/sql\n`)
console.log('6. Cole o SQL acima e execute\n')
console.log('7. Após executar, teste o upload novamente!\n')
console.log('✨ Pronto! As políticas permitirão:\n')
console.log('   ✅ Usuários logados podem fazer upload')
console.log('   ✅ Todos podem visualizar as logos')
console.log('   ✅ Usuários logados podem atualizar/deletar\n')
