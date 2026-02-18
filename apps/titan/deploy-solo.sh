#!/bin/bash
# Deploy APENAS do Titan - sem triggerrar outros projetos

set -e

echo "🚀 Deploy do Titan (SOLO - sem outros projetos)"
echo "================================================"

cd "$(dirname "$0")"

# Verifica se há mudanças não commitadas
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Há mudanças não commitadas. Faça commit primeiro:"
    git status -s
    exit 1
fi

# Faz deploy apenas deste diretório
echo "📦 Fazendo deploy do Titan..."
vercel --prod --yes

echo ""
echo "✅ Deploy do Titan concluído!"
echo "🌐 URL: https://titan.smaartpro.com"
