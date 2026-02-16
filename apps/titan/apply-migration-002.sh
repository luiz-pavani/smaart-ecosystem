#!/bin/bash

# Script para aplicar migração 002 - Adicionar logo e sigla

echo "🔄 Aplicando migração 002_add_logo_sigla.sql..."

# Ler variáveis de ambiente
source .env.local

# Aplicar migração via psql (requer psql instalado)
# Extrair a conexão string do Supabase
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\///' | sed 's/\.supabase\.co//')

echo "📊 Executando SQL no projeto: $PROJECT_REF"
echo ""
echo "⚠️  IMPORTANTE: Execute o SQL abaixo no Supabase Dashboard:"
echo ""
echo "1. Acesse: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
echo "2. Clique em 'New Query'"
echo "3. Cole o SQL do arquivo: supabase/migrations/002_add_logo_sigla.sql"
echo "4. Execute o SQL"
echo ""
echo "Alternativamente, copie e execute este SQL:"
echo "---"
cat supabase/migrations/002_add_logo_sigla.sql
echo "---"
echo ""
echo "✅ Após executar, os campos 'sigla' e 'logo_url' estarão disponíveis!"
