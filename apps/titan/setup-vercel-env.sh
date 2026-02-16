#!/bin/bash
# Script para adicionar variáveis de ambiente no Vercel

echo "🔧 Configurando variáveis de ambiente no Vercel..."

# Verificar variáveis necessárias
if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" || -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
	echo "❌ Variáveis de ambiente faltando. Configure em .env.local ou exporte no shell:"
	echo "   NEXT_PUBLIC_SUPABASE_URL"
	echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY"
	echo "   SUPABASE_SERVICE_ROLE_KEY"
	exit 1
fi

# Adicionar variáveis uma por uma
echo "$NEXT_PUBLIC_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo "✅ Variáveis de ambiente configuradas!"
echo "🚀 Iniciando deploy..."

vercel --prod --yes
