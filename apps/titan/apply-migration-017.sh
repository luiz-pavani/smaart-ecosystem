#!/bin/bash

# Script para aplicar Migration 017 automaticamente usando Supabase CLI
# Usage: bash apply-migration-017.sh

set -e

echo "🔧 Aplicando Migration 017 - RLS Fix..."
echo ""

PROJECT_ID="risvafrrbnozyjquxvzi"
SQL_FILE="/tmp/migration_017.sql"

# Create temporary SQL file
cat > "$SQL_FILE" << 'EOF'
-- Migration 017: COMPLETE RLS Reset

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

ALTER TABLE atletas ENABLE ROW LEVEL SECURITY;

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
EOF

echo "✅ SQL gerado em: $SQL_FILE"
echo ""
echo "📋 Digite seu POSTGRES_PASSWORD do Supabase:"
read -s POSTGRES_PASSWORD

echo ""
echo "🔌 Conectando ao banco de dados..."
echo ""

# Try to execute with psql
if command -v psql &> /dev/null; then
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    --host risvafrrbnozyjquxvzi.abcd.supabase.co \
    --port 5432 \
    --database postgres \
    --username postgres \
    -f "$SQL_FILE" && {
      echo ""
      echo "✅ SUCESSO! Migration 017 aplicada!"
      echo ""
      echo "🚀 Próximos passos:"
      echo "   1. Feche todas as abas do navegador"
      echo "   2. Limpe cache (Cmd+Shift+Delete)"
      echo "   3. Abra https://titan.smaartpro.com"
      echo "   4. Faça login novamente"
      echo "   5. Teste salvar um atleta novo"
    } || {
      echo ""
      echo "❌ Erro ao conectar. Tente manualmente:"
      echo "   URL: https://app.supabase.com/project/$PROJECT_ID/sql"
      echo "   Cole o conteúdo de: $SQL_FILE"
    }
else
  echo "❌ psql não encontrado. Instale PostgreSQL ou use manualmente."
  echo ""
  echo "📋 SQL para colar no Supabase SQL Editor:"
  cat "$SQL_FILE"
fi

# Cleanup
rm "$SQL_FILE"
