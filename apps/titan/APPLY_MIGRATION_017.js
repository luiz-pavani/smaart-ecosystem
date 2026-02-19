#!/usr/bin/env node

/**
 * Aplicar Migration 017 - RLS Fix Automático
 * Instrução: node apply-migration-017-guide.js
 */

const fs = require('fs');
const path = require('path');

const sqlContent = `-- Migration 017: COMPLETE RLS Reset - Drop ALL policies and recreate clean

-- Drop EVERY policy
DROP POLICY IF EXISTS "Federation admins can insert athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can insert athletes for their academy" ON atletas;
DROP POLICY IF EXISTS "Master access can insert atletas" ON atletas;
DROP POLICY IF EXISTS "Users can insert athletes based on their role" ON atletas;
DROP POLICY IF EXISTS "Atletas - insert based on role" ON atletas;
DROP POLICY IF EXISTS "MA Insert" ON atletas;
DROP POLICY IF EXISTS "FA Insert" ON atletas;
DROP POLICY IF EXISTS "AA Insert" ON atletas;

DROP POLICY IF EXISTS "Federation admins can view all athletes in their federation" ON atletas;
DROP POLICY IF EXISTS "Academia admins can view their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can view all atletas" ON atletas;
DROP POLICY IF EXISTS "Users can view athletes based on their role" ON atletas;
DROP POLICY IF EXISTS "Atletas - select based on role" ON atletas;
DROP POLICY IF EXISTS "MA Select" ON atletas;
DROP POLICY IF EXISTS "FA Select" ON atletas;
DROP POLICY IF EXISTS "AA Select" ON atletas;

DROP POLICY IF EXISTS "Federation admins can update athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can update their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can update atletas" ON atletas;
DROP POLICY IF EXISTS "Users can update athletes based on their role" ON atletas;
DROP POLICY IF EXISTS "Atletas - update based on role" ON atletas;
DROP POLICY IF EXISTS "MA Update" ON atletas;
DROP POLICY IF EXISTS "FA Update" ON atletas;
DROP POLICY IF EXISTS "AA Update" ON atletas;

DROP POLICY IF EXISTS "Federation admins can delete athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can delete atletas" ON atletas;
DROP POLICY IF EXISTS "Users can delete athletes based on their role" ON atletas;
DROP POLICY IF EXISTS "Atletas - delete based on role" ON atletas;
DROP POLICY IF EXISTS "MA Delete" ON atletas;
DROP POLICY IF EXISTS "FA Delete" ON atletas;
DROP POLICY IF EXISTS "AA Delete" ON atletas;

-- Ensure RLS is enabled
ALTER TABLE atletas ENABLE ROW LEVEL SECURITY;

-- 1. Master Access - can do EVERYTHING
CREATE POLICY "MA Insert"
  ON atletas FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
  );

CREATE POLICY "MA Select"
  ON atletas FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
  );

CREATE POLICY "MA Update"
  ON atletas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
  );

CREATE POLICY "MA Delete"
  ON atletas FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
  );

-- 2. Federation Admin
CREATE POLICY "FA Insert"
  ON atletas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND federacao_id = atletas.federacao_id 
      AND role IN ('federacao_admin', 'federacao_staff')
    )
  );

CREATE POLICY "FA Select"
  ON atletas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND federacao_id = atletas.federacao_id 
      AND role IN ('federacao_admin', 'federacao_staff')
    )
  );

CREATE POLICY "FA Update"
  ON atletas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND federacao_id = atletas.federacao_id 
      AND role IN ('federacao_admin', 'federacao_staff')
    )
  );

CREATE POLICY "FA Delete"
  ON atletas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND federacao_id = atletas.federacao_id 
      AND role = 'federacao_admin'
    )
  );

-- 3. Academia Admin
CREATE POLICY "AA Insert"
  ON atletas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND academia_id = atletas.academia_id 
      AND role IN ('academia_admin', 'academia_staff')
    )
  );

CREATE POLICY "AA Select"
  ON atletas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND academia_id = atletas.academia_id 
      AND role IN ('academia_admin', 'academia_staff')
    )
  );

CREATE POLICY "AA Update"
  ON atletas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND academia_id = atletas.academia_id 
      AND role IN ('academia_admin', 'academia_staff')
    )
  );

CREATE POLICY "AA Delete"
  ON atletas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND academia_id = atletas.academia_id 
      AND role = 'academia_admin'
    )
  );`;

console.log('🔧 Migration 017 - RLS Fix Guide\n');
console.log('=' .repeat(60));
console.log('\n⚠️  SUPABASE NÃO PERMITE EXECUTAR SQL VIA API\n');
console.log('Você precisa aplicar manualmente. Aqui está como:\n');
console.log('=' .repeat(60));
console.log('\n🌐 PASSO 1: Abra o SQL Editor\n');
console.log('   → https://app.supabase.com/project/risvafrrbnozyjquxvzi/sql\n');
console.log('🔐 PASSO 2: Deletar arquivo SQL anterior (se houver)\n');
console.log('   → Clique em "New Query" ou "Untitled Query"\n');
console.log('📋 PASSO 3: Cole TODO o SQL abaixo\n');
console.log('✅ PASSO 4: Clique RUN (Cmd+Enter ou Ctrl+Enter)\n');
console.log('=' .repeat(60));
console.log('\n');
console.log(sqlContent);
console.log('\n' + '=' .repeat(60));
console.log('\n✨ Depois de executar:\n');
console.log('1. Feche todas as abas do navegador');
console.log('2. Limpe o cache (Cmd+Shift+Delete)');
console.log('3. Abra https://titan.smaartpro.com');
console.log('4. Faça login novamente');
console.log('5. Teste cadastrar um atleta\n');
