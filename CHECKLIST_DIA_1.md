# ✅ CHECKLIST TÉCNICO - DIA 1 (17/02/2026)

**Objetivo:** Setup inicial para começar desenvolvimento

---

## 🔧 PRÉ-REQUISITOS DO SISTEMA

### Softwares & Versões
```
✅ Node.js v20+
✅ npm v10+ (ou pnpm v8+)
✅ Git v2.40+
✅ Visual Studio Code
```

Verificar:
```bash
node --version   # v20.x.x
npm --version    # v10.x.x
git --version    # v2.40+
```

### Acesso Necessário
- [ ] GitHub (para branches)
- [ ] Supabase Dashboard (DB migrations)
- [ ] Safe2Pay Dashboard (webhooks + API key)
- [ ] Firebase Console (Cloud Messaging setup)
- [ ] Vercel Dashboard (deployment)

---

## 🌿 SETUP DE BRANCHES

### Criar Branches Paralelas

```bash
# 1. Atualizar main
git checkout main
git pull origin main

# 2. Criar branch para Fase 1 - Pagamentos
git checkout -b feat/sistema-pagamentos-v2
git push origin feat/sistema-pagamentos-v2

# 3. Criar branch para Fase 1 - Acesso
git checkout -b feat/qr-acesso-frequencia
git push origin feat/qr-acesso-frequencia

# 4. Criar branch para Fase 1 - Inadimplência
git checkout -b feat/cobranca-inadimplencia
git push origin feat/cobranca-inadimplencia
```

---

## 💾 DATABASE - CRIAR MIGRATIONS

### Arquivo: `supabase/migrations/20260217_pagamentos_v2.sql`

```sql
-- Tabela de Pedidos/Pagamentos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id),
  atleta_id UUID NOT NULL REFERENCES atletas(id),
  
  valor DECIMAL(10,2) NOT NULL,
  moeda VARCHAR(3) DEFAULT 'BRL',
  descricao TEXT,
  
  status VARCHAR(20) DEFAULT 'pendente',
  metodo_pagamento VARCHAR(30),
  
  safe2pay_reference VARCHAR(100) UNIQUE,
  safe2pay_transaction_id VARCHAR(100),
  
  data_vencimento DATE,
  data_pagamento TIMESTAMP,
  tentativas_cobranca INT DEFAULT 0,
  proxima_tentativa_cobranca TIMESTAMP,
  motivo_recusa TEXT,
  
  mes_ref VARCHAR(7),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pedidos_academia ON pedidos(academia_id);
CREATE INDEX idx_pedidos_atleta ON pedidos(atleta_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_safe2pay ON pedidos(safe2pay_reference);

-- RLS
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atletas veem seus pedidos" ON pedidos
  FOR SELECT USING (atleta_id = auth.uid());

CREATE POLICY "Gestores veem pedidos da academia" ON pedidos
  FOR SELECT USING (
    academia_id IN (
      SELECT academia_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Tabela de Frequência
CREATE TABLE IF NOT EXISTS frequencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id),
  atleta_id UUID NOT NULL REFERENCES atletas(id),
  
  data_entrada DATE,
  hora_entrada TIME,
  data_saida DATE,
  hora_saida TIME,
  
  metodo_validacao VARCHAR(20) DEFAULT 'qr',
  status VARCHAR(20) DEFAULT 'ativo',
  motivo_negacao TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_frequencia_academia_data ON frequencia(academia_id, data_entrada);
CREATE INDEX idx_frequencia_atleta ON frequencia(atleta_id);

ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atletas veem sua frequência" ON frequencia
  FOR SELECT USING (atleta_id = auth.uid());

CREATE POLICY "Gestores veem frequência" ON frequencia
  FOR SELECT USING (
    academia_id IN (
      SELECT academia_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Tabela de Sesões QR
CREATE TABLE IF NOT EXISTS sessoes_qr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id UUID NOT NULL REFERENCES atletas(id),
  
  qr_token VARCHAR(500) UNIQUE NOT NULL,
  qr_image_url TEXT,
  
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_expiracao TIMESTAMP,
  
  usado BOOLEAN DEFAULT FALSE,
  data_uso TIMESTAMP,
  academia_uso UUID REFERENCES academias(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessoes_qr_atleta ON sessoes_qr(atleta_id);
CREATE INDEX idx_sessoes_qr_token ON sessoes_qr(qr_token);

-- Tabela de Webhooks Log
CREATE TABLE IF NOT EXISTS webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50),
  tipo_evento VARCHAR(100),
  payload JSONB,
  status_processamento VARCHAR(20),
  mensagem_erro TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhooks_provider ON webhooks_log(provider);
```

### Executar Migration

```bash
# Via CLI Supabase
supabase db push

# Ou via Dashboard:
# 1. Acessar Supabase Project
# 2. SQL Editor
# 3. Copiar e colar SQL acima
# 4. Executar
```

---

## 🔐 ENVIRONMENT VARIABLES

### Arquivo: `.env.local` (adicionar ao existente)

```env
# Safe2Pay
SAFE2PAY_API_KEY=seu_api_key_aqui
SAFE2PAY_API_SECRET=seu_secret_aqui
SAFE2PAY_WEBHOOK_SECRET=seu_webhook_secret_aqui

# QR Code
QR_SECRET_KEY=sua_chave_jwt_secreta_aqui

# Firebase (quando implementar notificações)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=
FIREBASE_ADMIN_SDK_PRIVATE_KEY=

# Cron Secret (para Vercel cron jobs)
CRON_SECRET=uuid_gerado_aleatoriamente

# URLs
NEXT_PUBLIC_URL=https://localhost:3000 (dev) ou https://titan-app.vercel.app (prod)
```

### Gerar Secrets

```bash
# Gerar chaves seguras
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomUUID())"
```

---

## 📦 PACKAGES A INSTALAR

### Adicionar ao `package.json`

```bash
npm install qrcode jsonwebtoken firebase-admin
npm install -D jest @testing-library/react ts-jest
```

### Verificar instalação

```bash
npm list qrcode jsonwebtoken firebase-admin
```

---

## 🏗️ ESTRUTURA DE PASTAS (criar)

```bash
# Criar pastas para Fase 1
mkdir -p app/api/pagamentos
mkdir -p app/api/checkin
mkdir -p app/api/webhooks/safe2pay
mkdir -p app/api/cron
mkdir -p app/api/acesso

mkdir -p app/(dashboard)/modulo-acesso
mkdir -p app/(dashboard)/pagamentos

mkdir -p components/qrcode
mkdir -p components/pagamentos

mkdir -p lib/integrations

mkdir -p hooks/usePagamentos
mkdir -p hooks/useQR

mkdir -p types/pagamentos
mkdir -p types/acesso
```

---

## 📝 ARQUIVOS A CRIAR (FASE 1)

### Pagamentos

```
✅ app/api/pagamentos/criar.ts
✅ app/api/pagamentos/listar.ts
✅ app/api/pagamentos/recobranca.ts
✅ app/api/webhooks/safe2pay/route.ts
✅ app/api/cron/processar-inadimplencia.ts
✅ lib/integrations/safe2pay.ts
✅ lib/integrations/webhooks.ts
✅ types/pagamentos.ts
✅ components/pagamentos/PagamentoForm.tsx
✅ app/(dashboard)/pagamentos/page.tsx
```

### Acesso & QR

```
✅ app/api/acesso/gerar-qr.ts
✅ app/api/checkin.ts
✅ app/api/acesso/historico.ts
✅ lib/integrations/qr.ts
✅ types/acesso.ts
✅ components/qrcode/QRGenerator.tsx
✅ components/qrcode/QRScanner.tsx
✅ app/(dashboard)/modulo-acesso/page.tsx
```

---

## 🧪 TESTES INICIAIS (Setup)

### Arquivo: `lib/__tests__/safe2pay.test.ts`

```typescript
import { gerarCheckoutSafePay } from '@/lib/integrations/safe2pay';

describe('Safe2Pay Integration', () => {
  it('deve gerar checkout link', async () => {
    const result = await gerarCheckoutSafePay({
      valor: 100,
      descricao: 'Anuidade Fevereiro 2026',
      metodo: 'BOLETO',
      reference: 'test-123'
    });

    expect(result).toHaveProperty('checkout_url');
    expect(result).toHaveProperty('reference');
  });
});
```

### Executar testes

```bash
npm test
```

---

## 🚀 PRIMEIROS ENDPOINTS (MÍNIMO VIÁVEL)

### 1. `app/api/pagamentos/criar.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { gerarCheckoutSafePay } from '@/lib/integrations/safe2pay';

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { academia_id, atleta_id, valor, descricao } = await request.json();

  try {
    // 1. Gerar reference única
    const reference = `PED-${Date.now()}-${atleta_id.slice(0, 8)}`;

    // 2. Criar pedido no DB
    const { data: pedido, error: dbError } = await supabase
      .from('pedidos')
      .insert({
        academia_id,
        atleta_id,
        valor,
        descricao,
        safe2pay_reference: reference,
        status: 'pendente'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 3. Gerar checkout em Safe2Pay
    const checkout = await gerarCheckoutSafePay({
      valor,
      descricao,
      metodo: 'BOLETO',
      reference
    });

    return NextResponse.json({
      pedido_id: pedido.id,
      reference,
      checkout_url: checkout.checkout_url,
      status: 'pendente'
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 2. `app/api/checkin.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { qr_token, academia_id } = await request.json();

  try {
    // 1. Validar QR token
    const decoded: any = jwt.verify(
      qr_token,
      process.env.QR_SECRET_KEY!
    );

    const atleta_id = decoded.user_id;
    const hoje = new Date().toISOString().split('T')[0];

    // 2. Verificar frequência hoje
    const { data: frequenciaHoje } = await supabase
      .from('frequencia')
      .select('id')
      .eq('atleta_id', atleta_id)
      .eq('data_entrada', hoje);

    if (frequenciaHoje?.length! > 0) {
      return NextResponse.json(
        { status: 'negado', motivo: 'ja_utilisado_hoje' },
        { status: 409 }
      );
    }

    // 3. Registrar frequência
    await supabase.from('frequencia').insert({
      academia_id,
      atleta_id,
      data_entrada: hoje,
      hora_entrada: new Date().toLocaleTimeString('pt-BR'),
      status: 'ativo'
    });

    return NextResponse.json({
      status: 'aprovado',
      mensagem: 'Bem-vindo!'
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }
}
```

---

## 🧠 CHECKLIST DIÁRIO

### Segunda 18/02
- [ ] Fazer pull request de análise (vazio, só para tracking)
- [ ] Executar migrations em staging
- [ ] Validar tables criadas em Supabase

### Terça 19/02
- [ ] Implementar `safe2pay.ts` (lib)
- [ ] Implementar `/api/pagamentos/criar`
- [ ] Testes unitários

### Quarta 20/02
- [ ] Implementar `qr.ts` (lib)
- [ ] Implementar `/api/acesso/gerar-qr`
- [ ] Implementar `/api/checkin`

### Quinta 21/02
- [ ] Componente `QRGenerator` React
- [ ] Página de modulo-acesso
- [ ] Testes no navegador

### Sexta 22/02
- [ ] Webhooks Safe2Pay
- [ ] Cron de inadimplência
- [ ] Testes end-to-end

---

## 📊 VALORES DE TESTE

### Safe2Pay (Sandbox)
```
Credenciais de teste disponibilizadas por Safe2Pay
API Key: sale_****** (via dashboard)
Secret: ****** (guarded)

Valores para teste:
✅ 100.00 (aprovado)
❌ 999.00 (recusado)
⏳ 400.00 (pendente)
```

### Supabase (Staging)
```
URL: https://ihq***.supabase.co
Key: eyJhbGc*** (anon key)
Service Role: eyJhbGc*** (admin key)
```

---

## 🎯 DEFINIÇÃO DE PRONTO (DEFINITION OF DONE)

Para cada feature considerada "concluída":

- [ ] Código passando em testes unitários (jest)
- [ ] Cobertura >= 80%
- [ ] Pull request com 2+ aprovações
- [ ] Deploy em staging sem erros
- [ ] Testado manualmente (happy path + edge cases)
- [ ] Documentação atualizada
- [ ] Sem TODO comments deixados
- [ ] Performance aceitável (< 200ms)

---

## 📞 SUPORTE TÉCNICO

### Contatos por Bloco

**Safe2Pay:**
- Docs: https://portal.safe2pay.com.br/docs
- Suporte: suporte@safe2pay.com.br
- Sandbox Dashboard: https://safe2pay.com.br

**Firebase:**
- Docs: https://firebase.google.com/docs
- Console: https://console.firebase.google.com

**Supabase:**
- Docs: https://supabase.com/docs
- Dashboard: https://app.supabase.com

---

## ⚠️ RISCOS & MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|--------|-----------|
| Safe2Pay API down | Média | Alto | Fallback para pagamento manual |
| QR Code expiração | Baixa | Médio | Regeneração automática a cada 2h |
| Rate limit Supabase | Baixa | Médio | Pagination + caching |
| Deploy fails | Média | Alto | CI/CD com validação de schema |

---

## 🎓 CONHECIMENTOS NECESSÁRIOS

- [ ] JWT (JSON Web Tokens) - para QR validation
- [ ] Webhooks (concept + security)
- [ ] API REST (POST, GET, validação)
- [ ] Supabase RLS policies
- [ ] Cron jobs / scheduled tasks
- [ ] React hooks (useState, useEffect)
- [ ] TypeScript (types, interfaces)

---

**Status:** 🔴 Pronto para começar  
**Data:** 17/02/2026  
**Owner:** Dev Team  
**Revisto por:** [Nome]  
**Próximo Review:** 22/02/2026
