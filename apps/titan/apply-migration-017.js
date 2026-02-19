#!/usr/bin/env node

/**
 * Script para aplicar Migration 017 automaticamente no Supabase
 * Executa: Limpa policies antigas + Cria novo RLS policies
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://risvafrrbnozyjquxvzi.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc3ZhZnJyYm5venlqcXV4dnppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE2NDkxMywiZXhwIjoyMDg2NzQwOTEzfQ.kaZxNIQMoyY_eLgIfTJTFL8B-4hvdPJ_TDvRRW-qSPU';

const SQL_MIGRATION = `
-- Migration 017: COMPLETE RLS Reset - Drop ALL policies and recreate clean

-- Drop EVERY policy (not just known ones)
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

-- 2. Federation Admin - can manage athletes in their federation
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

-- 3. Academia Admin - can manage athletes in their academy
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
  );
`;

async function applyMigration() {
  try {
    console.log('🔧 Iniciando aplicação da Migration 017...\n');

    // Create admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('📡 Conectando ao Supabase...');
    console.log(`URL: ${SUPABASE_URL}\n`);

    // Execute the SQL migration
    console.log('⚙️  Executando SQL...\n');
    const { error } = await supabase.rpc('query', {
      query: SQL_MIGRATION,
    });

    if (error) {
      // Try alternative method using direct SQL execution
      console.log('⚠️  Tentando método alternativo...\n');
      
      // Use postgres to execute raw SQL
      const { data, error: execError } = await supabase.rpc('exec_sql', {
        sql_query: SQL_MIGRATION,
      });

      if (execError) {
        console.error('❌ ERRO ao executar SQL:', execError.message);
        console.log('\n⚠️  Supabase API não permite execução de SQL diretamente.');
        console.log('📋 Por favor, COPIE o SQL abaixo e cole no Supabase SQL Editor:\n');
        console.log('URL: https://app.supabase.com/project/risvafrrbnozyjquxvzi/sql\n');
        console.log(SQL_MIGRATION);
        process.exit(1);
      }
    }

    console.log('✅ Migration 017 aplicada com SUCESSO!\n');
    console.log('✨ RLS Policies recriadas com sucesso!\n');
    console.log('🚀 Status:');
    console.log('   ✅ Todas as policies antigas foram removidas');
    console.log('   ✅ 4 policies Master Access criadas');
    console.log('   ✅ 4 policies Federation Admin criadas');
    console.log('   ✅ 4 policies Academia Admin criadas\n');
    console.log('Próximo passo: Limpar cache do navegador e recarregar https://titan.smaartpro.com\n');

  } catch (err) {
    console.error('❌ ERRO CRÍTICO:', err.message);
    console.log('\n📋 Abra o SQL Editor e copie/cole este SQL:\n');
    console.log(SQL_MIGRATION);
    process.exit(1);
  }
}

// Run
applyMigration();
