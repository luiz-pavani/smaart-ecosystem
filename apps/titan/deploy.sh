#!/bin/bash

# Deploy Script para Titan
# Uso: ./deploy.sh "Mensagem de commit"

if [ -z "$1" ]; then
  echo "❌ Erro: Forneça uma mensagem de commit"
  echo "Uso: ./deploy.sh \"Mensagem de commit\""
  exit 1
fi

COMMIT_MSG="$1"

echo "🚀 Iniciando processo de deploy..."
echo ""

# 1. Verificar status
echo "📋 Status git:"
git status --short || exit 1
echo ""

# 2. Build local
echo "🔨 Compilando localmente..."
npm run build || { echo "❌ Build falhou"; exit 1; }
echo "✅ Build OK"
echo ""

# 3. Commit
echo "📝 Comitando: $COMMIT_MSG"
git add -A
git commit -m "$COMMIT_MSG" || { echo "⚠️  Nada para comitar"; }
echo ""

# 4. Push
echo "⬆️  Fazendo push..."
git push || { echo "❌ Push falhou"; exit 1; }
echo "✅ Push OK"
echo ""

# 5. Deploy
echo "🌐 Deployando no Vercel..."
npx vercel deploy --prod --yes || { echo "❌ Deploy falhou"; exit 1; }
echo ""

echo "✅ Deploy completo!"
echo ""
