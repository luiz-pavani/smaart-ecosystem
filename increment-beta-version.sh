#!/bin/bash
# Script para incrementar automaticamente o número do BETA durante deployment
# Uso: ./increment-beta-version.sh

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$WORKSPACE_ROOT"

# Encontrar arquivo BETA-*.md atual
CURRENT_BETA_FILE=$(ls BETA-*.md 2>/dev/null | head -1)

if [ -z "$CURRENT_BETA_FILE" ]; then
    echo "❌ Nenhum arquivo BETA-*.md encontrado"
    exit 1
fi

# Extrair número current do Beta (ex: BETA-12-RELEASE.md → 12)
CURRENT_VERSION=$(echo "$CURRENT_BETA_FILE" | grep -oP 'BETA-\K\d+' | head -1)
NEW_VERSION=$((CURRENT_VERSION + 1))

echo "📌 Incrementando versão: BETA-${CURRENT_VERSION} → BETA-${NEW_VERSION}"

# Novo nome do arquivo
NEW_BETA_FILE="BETA-${NEW_VERSION}-RELEASE.md"

# Se o arquivo novo já existe, não fazer nada
if [ -f "$NEW_BETA_FILE" ]; then
    echo "⚠️  Arquivo $NEW_BETA_FILE já existe. Pulando."
    exit 0
fi

# Copiar arquivo anterior para novo
cp "$CURRENT_BETA_FILE" "$NEW_BETA_FILE"

# Atualizar referência de versão no novo arquivo
sed -i '' "s/CURRENT RELEASE: BETA ${CURRENT_VERSION}/CURRENT RELEASE: BETA ${NEW_VERSION}/g" "$NEW_BETA_FILE"
sed -i '' "s/Release Date: .*/Release Date: $(date +%B\ %d,\ %Y)/g" "$NEW_BETA_FILE"

# Adicionar nova entrada no histórico de versões
HISTORY_SECTION="VERSION HISTORY:
================"
NEW_HISTORY=$(cat <<EOF
BETA ${NEW_VERSION} ($( date +%b\ %d,\ %Y)) - Deployment on $(date +%b\ %d,\ %Y)
  - Auto-incremented beta version
  - Previous version: BETA ${CURRENT_VERSION}

EOF
)

# Inserir nova versão no histórico
sed -i '' "/${HISTORY_SECTION}/{
N
s/${HISTORY_SECTION}/${HISTORY_SECTION}\n${NEW_HISTORY}/
}" "$NEW_BETA_FILE"

echo "✅ Arquivo criado: $NEW_BETA_FILE"
echo "✅ Versão BETA incrementada com sucesso!"
echo ""
echo "📋 Summary:"
echo "   Versão anterior: BETA-${CURRENT_VERSION}"
echo "   Versão atual: BETA-${NEW_VERSION}"
echo "   Arquivo: $NEW_BETA_FILE"
echo ""
echo "💡 Próximo passo: Fazer commit e push dos arquivos"
echo "   git add BETA-*.md"
echo "   git commit -m 'chore: increment beta version to $NEW_VERSION'"
echo "   git push"
