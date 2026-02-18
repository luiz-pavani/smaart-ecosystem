#!/bin/bash

# Test Safe2Pay Webhooks
# Usar: chmod +x test-safe2pay-webhooks.sh && ./test-safe2pay-webhooks.sh

WEBHOOK_URL="https://titan.smaartpro.com/api/webhooks/safe2pay"

echo "🧪 Testando Webhooks Safe2Pay"
echo "================================"
echo ""

# Teste 1: SubscriptionCreated
echo "1️⃣ Teste: SubscriptionCreated"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "SubscriptionCreated",
    "IdSubscription": "TEST-SUB-2026-001",
    "IdTransaction": "TEST-TRANS-001",
    "Status": 3,
    "Amount": 129.90,
    "Customer": {
      "Email": "teste.create@example.com",
      "Name": "Teste Create"
    },
    "Reference": "SUBSCRIPTION:teste.create@example.com"
  }' | json_pp
echo ""
echo "---"
echo ""

# Teste 2: SubscriptionRenewed
echo "2️⃣ Teste: SubscriptionRenewed"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "SubscriptionRenewed",
    "IdSubscription": "TEST-SUB-2026-001",
    "IdTransaction": "TEST-TRANS-002",
    "Status": 3,
    "Amount": 129.90,
    "Customer": {
      "Email": "teste.renew@example.com",
      "Name": "Teste Renewed"
    }
  }' | json_pp
echo ""
echo "---"
echo ""

# Teste 3: SubscriptionFailed
echo "3️⃣ Teste: SubscriptionFailed"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "SubscriptionFailed",
    "IdSubscription": "TEST-SUB-2026-001",
    "IdTransaction": "TEST-TRANS-003",
    "Status": 1,
    "Amount": 129.90,
    "Customer": {
      "Email": "teste.failed@example.com",
      "Name": "Teste Failed"
    },
    "Reference": "Cartão recusado"
  }' | json_pp
echo ""
echo "---"
echo ""

# Teste 4: SubscriptionCanceled
echo "4️⃣ Teste: SubscriptionCanceled"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "SubscriptionCanceled",
    "IdSubscription": "TEST-SUB-2026-001",
    "IdTransaction": "TEST-TRANS-004",
    "Customer": {
      "Email": "teste.cancel@example.com",
      "Name": "Teste Canceled"
    },
    "Reference": "Cancelado pelo usuário"
  }' | json_pp
echo ""
echo "---"
echo ""

# Teste 5: SubscriptionExpired
echo "5️⃣ Teste: SubscriptionExpired"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "SubscriptionExpired",
    "IdSubscription": "TEST-SUB-2026-001",
    "IdTransaction": "TEST-TRANS-005",
    "Customer": {
      "Email": "teste.expired@example.com",
      "Name": "Teste Expired"
    }
  }' | json_pp
echo ""
echo "---"
echo ""

echo "✅ Testes concluídos!"
echo ""
echo "🔍 Verificar logs em:"
echo "  https://supabase.com → webhook_logs table"
echo ""
echo "📊 Verificar assinaturas em:"
echo "  https://supabase.com → assinaturas table"
