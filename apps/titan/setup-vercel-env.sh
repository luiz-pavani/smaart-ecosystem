#!/bin/bash
# Script para adicionar variáveis de ambiente no Vercel

echo "🔧 Configurando variáveis de ambiente no Vercel..."

# Adicionar variáveis uma por uma
echo "https://risvafrrbnozyjquxvzi.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production

echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc3ZhZnJyYm5venlqcXV4dnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjQ5MTMsImV4cCI6MjA4Njc0MDkxM30.6_iYgW9Fpku3FKzXsS16Ys1rid-C0OSVDzCfNNQK2P0" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc3ZhZnJyYm5venlqcXV4dnppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE2NDkxMywiZXhwIjoyMDg2NzQwOTEzfQ.kaZxNIQMoyY_eLgIfTJTFL8B-4hvdPJ_TDvRRW-qSPU" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo "✅ Variáveis de ambiente configuradas!"
echo "🚀 Iniciando deploy..."

vercel --prod --yes
