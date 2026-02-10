#!/usr/bin/env node
// Temporary script to fix RLS issue on vendas table
// Run: node fix-rls.js

const https = require('https');

const SUPABASE_URL = 'https://sxmrqiohfrktwlkwmfyr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4bXJxaW9oZnJrdHdsa3dtZnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTQzNzgsImV4cCI6MjA4MzM5MDM3OH0.LAMsBdZTpfXIuICluFb7MBii2DTbH-LCgq269l6RF6Q';

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
