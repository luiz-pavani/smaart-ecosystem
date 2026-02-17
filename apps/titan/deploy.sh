#!/bin/bash

# Deploy Script para Titan
# Uso: ./deploy.sh "Mensagem de commit" [--skip-build]

if [ -z "$1" ]; then
  echo "❌ Erro: Forneça uma mensagem de commit"
  echo "Uso: ./deploy.sh \"Mensagem de commit\" [--skip-build]"
  exit 1
fi

COMMIT_MSG="$1"
SKIP_BUILD="$2"

echo "🚀 Iniciando processo de deploy..."
echo ""

# 1. Verificar branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "⚠️  Você está no branch: $BRANCH"
  read -p "Continuar? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 2. Verificar status
echo "📋 Status git:"
git status --short || exit 1
echo ""

# 3. Build local (opcional)
if [ "$SKIP_BUILD" != "--skip-build" ]; then
  echo "🔨 Compilando localmente..."
  npm run build || { echo "❌ Build falhou"; exit 1; }
  echo "✅ Build OK"
  echo ""
else
  echo "⏭️  Build ignorado"
  echo ""
fi

# 4. Commit
echo "📝 Comitando: $COMMIT_MSG"
git add -A
if git commit -m "$COMMIT_MSG"; then
  echo "✅ Commit realizado"
else
  echo "⚠️  Nada para comitar ou commit falhou"
fi
echo ""

# 5. Push
echo "⬆️  Fazendo push..."
git push || { echo "❌ Push falhou"; exit 1; }
echo "✅ Push OK"
echo ""

# 6. Deploy manual no Vercel
echo "🌐 Deployando no Vercel..."
vercel --prod || { echo "❌ Deploy falhou"; exit 1; }
echo ""

echo "✅ Deploy completo!"
echo "🔗 https://titan.smaartpro.com"
echo ""
