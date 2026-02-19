#!/bin/bash
# Deploy com auto-increment de versão BETA
# Uso: ./deploy-with-beta.sh

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$WORKSPACE_ROOT"

echo "🚀 SMAART PRO - Deployment com Auto-versioning BETA"
echo "===================================================="
echo ""

# Step 1: Incrementar versão BETA
echo "📝 Step 1: Incrementando versão BETA..."
if [ -f "./increment-beta-version.sh" ]; then
    chmod +x "./increment-beta-version.sh"
    ./increment-beta-version.sh
    
    # Fazer commit da versão BETA
    NEW_BETA_FILE=$(ls -1 BETA-*.md 2>/dev/null | sort -V | tail -1)
    BETA_VERSION=$(echo "$NEW_BETA_FILE" | sed -E 's/BETA-([0-9]+).*/\1/')
    
    git add "$NEW_BETA_FILE"
    git commit -m "chore: increment beta version to $BETA_VERSION" 2>/dev/null || echo "⚠️  Nenhuma mudança na versão BETA"
else
    echo "⚠️  Script increment-beta-version.sh não encontrado. Pulando..."
fi

echo ""

# Step 2: Deploy para Vercel
echo "📝 Step 2: Fazendo deploy para Vercel..."
cd apps/titan

if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado. Instale com: npm install -g vercel"
    exit 1
fi

echo ""
echo "💻 Executando: vercel deploy --prod"
vercel deploy --prod

echo ""
echo "✅ DEPLOY COMPLETO!"
echo "🎉 BETA incrementada e código em produção"
echo ""

