#!/bin/bash

# 🧪 TESTE DOS ENDPOINTS DE FREQUÊNCIA
# Use este script para validar se tudo está funcionando

API_URL="https://titan.smaartpro.com"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🧪 TESTE DE ENDPOINTS${NC}"
echo -e "${BLUE}================================${NC}\n"

# Token de teste (você precisa obter um JWT válido)
TOKEN="${JWT_TOKEN:-seu_token_aqui}"

if [ "$TOKEN" = "seu_token_aqui" ]; then
  echo -e "${YELLOW}⚠️  AVISO: Defina a variável JWT_TOKEN${NC}"
  echo -e "${YELLOW}Como usar:${NC}"
  echo -e "${YELLOW}export JWT_TOKEN=\"seu_token_jwt\"${NC}"
  echo -e "${YELLOW}./test-frequencia.sh${NC}\n"
fi

# ============================================
# 1. TEST: GET /api/acesso/historico
# ============================================
echo -e "${BLUE}[1] GET /api/acesso/historico${NC}"
echo -e "Objetivo: Buscar histórico de frequência (últimos 30 dias)"
echo ""

curl -s -X GET "${API_URL}/api/acesso/historico?dias=30" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "❌ Erro ao conectar"

echo -e "\n${BLUE}---${NC}\n"

# ============================================
# 2. TEST: POST /api/acesso/checkin (MOCK)
# ============================================
echo -e "${BLUE}[2] POST /api/acesso/checkin${NC}"
echo -e "Objetivo: Fazer check-in com QR code"
echo -e "Nota: Substitua os valores com dados reais"
echo ""

MOCK_QR_TOKEN="MOCK-TOKEN-abc123def456"
MOCK_ACADEMIA_ID="550e8400-e29b-41d4-a716-446655440000"

echo -e "${YELLOW}Payload enviado:${NC}"
echo "{
  \"qr_token\": \"${MOCK_QR_TOKEN}\",
  \"academia_id\": \"${MOCK_ACADEMIA_ID}\",
  \"dispositivo\": \"web\"
}"

curl -s -X POST "${API_URL}/api/acesso/checkin" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"qr_token\": \"${MOCK_QR_TOKEN}\",
    \"academia_id\": \"${MOCK_ACADEMIA_ID}\",
    \"dispositivo\": \"web\"
  }" | jq '.' 2>/dev/null || echo "❌ Erro ao conectar"

echo -e "\n${BLUE}---${NC}\n"

# ============================================
# 3. TEST: POST /api/acesso/checkin-manual
# ============================================
echo -e "${BLUE}[3] POST /api/acesso/checkin-manual${NC}"
echo -e "Objetivo: Registrar entrada manual (requer role: academia_admin/gestor)"
echo ""

MOCK_ATLETA_ID="550e8400-e29b-41d4-a716-446655440001"
DATA_HOJE=$(date +%Y-%m-%d)

echo -e "${YELLOW}Payload enviado:${NC}"
echo "{
  \"atleta_id\": \"${MOCK_ATLETA_ID}\",
  \"academia_id\": \"${MOCK_ACADEMIA_ID}\",
  \"data\": \"${DATA_HOJE}\",
  \"hora_entrada\": \"08:30\"
}"

curl -s -X POST "${API_URL}/api/acesso/checkin-manual" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"atleta_id\": \"${MOCK_ATLETA_ID}\",
    \"academia_id\": \"${MOCK_ACADEMIA_ID}\",
    \"data\": \"${DATA_HOJE}\",
    \"hora_entrada\": \"08:30\"
  }" | jq '.' 2>/dev/null || echo "❌ Erro ao conectar"

echo -e "\n${BLUE}---${NC}\n"

# ============================================
# RESUMO
# ============================================
echo -e "${GREEN}✅ TESTES COMPLETOS${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Executar as migrations no Supabase"
echo "2. Obter um JWT token válido"
echo "3. Executar: export JWT_TOKEN=\"seu_token\" && ./test-frequencia.sh"
echo "4. Verificar respostas esperadas"
echo ""
echo -e "${YELLOW}URLs para testar manualmente:${NC}"
echo "- Página: https://titan.smaartpro.com/dashboard/modulo-acesso"
echo "- Histórico: https://titan.smaartpro.com/dashboard/modulo-acesso/frequencia"
echo ""
