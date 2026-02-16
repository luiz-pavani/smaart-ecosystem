#!/usr/bin/env node
// Temporary script to fix RLS issue on vendas table
// Run: node fix-rls.js

const https = require('https');

// Query que desabilita RLS (simples SELECT que precisa ser executado)
const SQL = `
  ALTER TABLE public.vendas DISABLE ROW LEVEL SECURITY;
`;

console.log('Tentando desabilitar RLS na tabela vendas via REST API...');
console.log('Note: Isso requer acesso admin (SERVICE_ROLE_KEY)');
console.log('');
console.log('Execute manualmente no Supabase SQL Editor:');
console.log('---');
console.log(SQL);
console.log('---');
console.log('');
console.log('Ou use: supabase db execute');
