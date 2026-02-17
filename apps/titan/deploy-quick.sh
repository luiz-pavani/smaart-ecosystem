#!/bin/bash

# Deploy Rápido para Titan - sem build local
# Uso: ./deploy-quick.sh "Mensagem de commit"

if [ -z "$1" ]; then
  echo "❌ Erro: Forneça uma mensagem de commit"
  echo "Uso: ./deploy-quick.sh \"Mensagem de commit\""
  exit 1
fi

COMMIT_MSG="$1"

echo "⚡ Deploy rápido..."

# Commit e push
git add -A
if git commit -m "$COMMIT_MSG"; then
  echo "✅ Commit realizado"
fi

git push && echo "✅ Push OK"

# Deploy no Vercel
echo "🌐 Deploy no Vercel..."
vercel --prod

echo ""
echo "✅ Deploy completo!"
echo "🔗 https://titan.smaartpro.com"
