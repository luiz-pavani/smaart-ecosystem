#!/bin/bash
# Script para incrementar automaticamente o número do BETA durante deployment
# Uso: ./increment-beta-version.sh

set -e

WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$WORKSPACE_ROOT"

# Encontrar arquivo BETA-*.md atual (versão mais alta)
CURRENT_BETA_FILE=""
for file in $(ls -1 BETA-*.md 2>/dev/null | sort -V | tail -1); do
    CURRENT_BETA_FILE="$file"
    break
done

# Se nenhum arquivo for encontrado, tentar abordagem alternativa
if [ -z "$CURRENT_BETA_FILE" ]; then
    CURRENT_BETA_FILE=$(ls -1 BETA-*.md 2>/dev/null | tail -1)
fi

if [ -z "$CURRENT_BETA_FILE" ]; then
    echo "❌ Nenhum arquivo BETA-*.md encontrado"
    exit 1
fi

# Extrair número current do Beta usando sed (macOS compatible)
# Ex: BETA-12-RELEASE.md → 12
CURRENT_VERSION=$(echo "$CURRENT_BETA_FILE" | sed -E 's/BETA-([0-9]+).*/\1/')

if [ -z "$CURRENT_VERSION" ] || ! [[ "$CURRENT_VERSION" =~ ^[0-9]+$ ]]; then
    echo "❌ Não consegui extrair número de versão de $CURRENT_BETA_FILE"
    exit 1
fi

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
echo "Copiando $CURRENT_BETA_FILE para $NEW_BETA_FILE..."
cp "$CURRENT_BETA_FILE" "$NEW_BETA_FILE"

# Atualizar referência de versão no novo arquivo (macOS compatible)
sed -i '' "s/CURRENT RELEASE: BETA ${CURRENT_VERSION}/CURRENT RELEASE: BETA ${NEW_VERSION}/g" "$NEW_BETA_FILE"

# Atualizar data de release
CURRENT_DATE=$(date +"%B %d, %Y")
sed -i '' "s/Release Date: .*/Release Date: ${CURRENT_DATE}/g" "$NEW_BETA_FILE"

echo "✅ Arquivo criado: $NEW_BETA_FILE"
echo "✅ Versão BETA incrementada com sucesso!"
echo ""
echo "📋 Summary:"
echo "   Versão anterior: BETA-${CURRENT_VERSION}"
echo "   Versão atual: BETA-${NEW_VERSION}"
echo "   Arquivo: $NEW_BETA_FILE"
echo ""


