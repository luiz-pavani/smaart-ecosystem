# 🗂️ ESTRUTURA DE PASTAS - SPRINT 1A + 1B

**Objetivo:** Criar estrutura de diretórios e listar todos arquivos que devem ser criados  
**Tempo estimado:** 30 minutos  
**Status:** PRONTO PARA EXECUTAR

---

## 📦 ESTRUTURA A CRIAR

### SPRINT 1A - Pagamentos

```
apps/titan/
├── app/
│   └── api/
│       ├── pagamentos/              ← NOVA PASTA
│       │   ├── criar.ts             ← Endpoint POST
│       │   └── listar.ts            ← Endpoint GET
│       └── webhooks/                ← JÁ EXISTE
│           └── safe2pay/            ← NOVA PASTA
│               └── route.ts         ← Webhook handler
├── lib/
│   ├── integrations/                ← NOVA PASTA
│   │   └── safe2pay.ts              ← Client Safe2Pay
│   └── schemas/
│       └── pagamentos.ts            ← Validações (Zod)
└── (dashboard)/
    ├── pagamentos/                  ← NOVA PASTA
    │   ├── page.tsx                 ← Dashboard lista pedidos
    │   └── [id]/
    │       └── page.tsx             ← Detalhe do pedido
```

### SPRINT 1B - QR Code + Acesso

```
apps/titan/
├── app/
│   └── api/
│       └── acesso/                  ← NOVA PASTA
│           ├── gerar-qr.ts          ← GET QR
│           └── checkin.ts           ← POST validação
├── components/
│   └── acesso/                      ← NOVA PASTA
│       ├── QRGenerator.tsx           ← Componente QR do aluno
│       ├── QRScanner.tsx             ← Componente scanner (tablet)
│       └── FrequencyChart.tsx        ← Gráfico de presença
├── lib/
│   ├── acesso/                      ← NOVA PASTA
│   │   └── qr-validation.ts         ← Validação de token JWT
│   └── schemas/
│       └── acesso.ts                ← Validações (Zod)
└── (dashboard)/
    ├── modulo-acesso/               ← NOVA PASTA
    │   ├── page.tsx                 ← Dashboard aluno
    │   └── frequencia/
    │       └── page.tsx             ← Histórico de frequência
```

---

## 🎯 PASSO A PASSO - CRIAR ESTRUTURA

### Terminal (EXECUTE ISTO):

```bash
# SPRINT 1A - Pagamentos
mkdir -p app/api/pagamentos
mkdir -p app/api/webhooks/safe2pay
mkdir -p lib/integrations
mkdir -p app/\(dashboard\)/pagamentos/\[id\]
mkdir -p lib/schemas

# SPRINT 1B - QR Acesso
mkdir -p app/api/acesso
mkdir -p components/acesso
mkdir -p app/\(dashboard\)/modulo-acesso/frequencia
mkdir -p lib/acesso
```

### Ou clique para executar:

<click aqui para executar tudo>

---

## 📋 ARQUIVOS A CRIAR (Ordem de Prioridade)

### 🔴 SPRINT 1A - PAGAMENTOS

#### LEVEL 1: Schema & Validações

```
[ ] lib/schemas/pagamentos.ts         (Zod validations)
[ ] lib/integrations/safe2pay.ts      (Safe2Pay client)
```

#### LEVEL 2: API Endpoints

```
[ ] app/api/pagamentos/criar.ts       (POST - create order)
[ ] app/api/pagamentos/listar.ts      (GET - list by academy)
[ ] app/api/webhooks/safe2pay/route.ts (POST - webhook handler)
```

#### LEVEL 3: Frontend Dashboard

```
[ ] app/(dashboard)/pagamentos/page.tsx        (Listagem)
[ ] app/(dashboard)/pagamentos/[id]/page.tsx   (Detalhe)
```

#### LEVEL 4: Cron Jobs (Automação)

```
[ ] app/api/cron/processar-inadimplencia.ts   (Daily task)
```

---

### 🔵 SPRINT 1B - QR ACESSO

#### LEVEL 1: Schema & Validações

```
[ ] lib/schemas/acesso.ts             (Zod validations)
[ ] lib/acesso/qr-validation.ts       (JWT token validation)
```

#### LEVEL 2: Components

```
[ ] components/acesso/QRGenerator.tsx       (Aluno view)
[ ] components/acesso/QRScanner.tsx         (Catraca/tablet)
[ ] components/acesso/FrequencyChart.tsx    (Stats)
```

#### LEVEL 3: API Endpoints

```
[ ] app/api/acesso/gerar-qr.ts        (GET - generate QR)
[ ] app/api/acesso/checkin.ts          (POST - validate)
```

#### LEVEL 4: Frontend Dashboard

```
[ ] app/(dashboard)/modulo-acesso/page.tsx              (Aluno dashboard)
[ ] app/(dashboard)/modulo-acesso/frequencia/page.tsx   (Histórico)
```

---

## 🚀 COMO PROCEDER (RECOMENDADO)

### Segunda-Feira (Dev 1 + Dev 2)

```
09:00 - Reunião de kickoff (30 min)

09:30 - Setup Local
  [ ] Dev 1:
      - git checkout feat/sprint-1a-pagamentos
      - npm install safe2pay (command TBD)
      - Criar pastas Sprint 1A
      - Começar lib/schemas/pagamentos.ts
      
  [ ] Dev 2:
      - git checkout feat/sprint-1b-qr-acesso
      - npm install jsonwebtoken qrcode
      - Criar pastas Sprint 1B
      - Começar lib/schemas/acesso.ts

10:30 - Ejecutar migrations (AMBOS)
  [ ] Abrir Supabase
  [ ] Copiar BLOCO SPRINT 1A → SQL Editor → Run
  [ ] Copiar BLOCO SPRINT 1B → SQL Editor → Run
  [ ] Confirmar 5 tabelas criadas
  [ ] Volta para cod=ing

11:00 - Começar LEVEL 1
  [ ] Dev 1: lib/schemas/pagamentos.ts
  [ ] Dev 2: lib/schemas/acesso.ts
```

---

## 🔗 REFERÊNCIAS DOS DOCUMENTOS

Para código pronto (copy/paste):

| Arquivo | Dev | Código Pronto |
|---------|-----|--------------|
| `/api/pagamentos/criar.ts` | Dev 1 | [SPRINT_1_PAGAMENTOS.md](./SPRINT_1_PAGAMENTOS.md#L150) |
| `/api/webhooks/safe2pay/route.ts` | Dev 1 | [SPRINT_1_PAGAMENTOS.md](./SPRINT_1_PAGAMENTOS.md#L200) |
| `/api/acesso/gerar-qr.ts` | Dev 2 | [SPRINT_2_ACESSO_QR.md](./SPRINT_2_ACESSO_QR.md#L150) |
| `/api/acesso/checkin.ts` | Dev 2 | [SPRINT_2_ACESSO_QR.md](./SPRINT_2_ACESSO_QR.md#L200) |

---

## ✅ CHECKLIST DE SETUP

- [ ] Branches criadas (ambos devs)
- [ ] Migrações SQL executadas em Supabase
- [ ] Tabelas verificadas (5 totais)
- [ ] Pastas criadas localmente (ambos)
- [ ] Dev 1 checkout feat/sprint-1a-pagamentos
- [ ] Dev 2 checkout feat/sprint-1b-qr-acesso
- [ ] npm run dev testado (ambos)

---

## 💾 PRÓXIMO DOCUMENTO

Leia: **ENDPOINTS_SPRINT_1A_1B.md** (código pronto para copiar)

