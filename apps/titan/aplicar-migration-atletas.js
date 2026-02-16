// Script to apply migration 006_atletas.sql
// Run this SQL directly in Supabase SQL Editor: https://supabase.com/dashboard/project/risvafrrbnozyjquxvzi/sql

const fs = require('fs')
const path = require('path')

console.log('📋 INSTRUÇÕES PARA APLICAR A MIGRATION:\n')
console.log('1. Acesse: https://supabase.com/dashboard/project/risvafrrbnozyjquxvzi/sql')
console.log('2. Copie o conteúdo da migration abaixo')
console.log('3. Cole no SQL Editor do Supabase')
console.log('4. Clique em "Run" para executar\n')
console.log('=' .repeat(80))
console.log('\n')

const migrationPath = path.join(__dirname, 'supabase', 'migrations', '006_atletas.sql')
const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

console.log(migrationSQL)
console.log('\n')
console.log('=' .repeat(80))
console.log('\n✅ Após executar, a tabela "atletas" estará criada com:')
console.log('  - Campos completos de cadastro (nome, CPF, RG, contato, endereço)')
console.log('  - Graduação: BRANCA até FAIXA PRETA|YUDANSHA')  
console.log('  - Dan: SHODAN até HACHIDAN (para faixas-pretas)')
console.log('  - Nível de arbitragem e certificados')
console.log('  - Upload de fotos (perfil + documento)')
console.log('  - Sistema de lotes (ex: "2026 1")')
console.log('  - Número de registro automático (formato: FED-ACAD-YYYY-NNNN)')
console.log('  - RLS policies para federação e academia')
console.log('  - Triggers automáticos para número de registro e updated_at')
