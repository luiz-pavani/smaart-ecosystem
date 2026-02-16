# 🚀 TITAN - Plano de Implementação - Fase 1

## ✅ APROVADO - Pronto para Começar!

**Data**: 15/02/2026  
**Status**: Design aprovado, iniciando implementação

---

## 🎨 Design System Aprovado

### Cores LRSJ
- **Verde**: `#16A34A` (Primária)
- **Vermelho**: `#DC2626` (Secundária/Acento)
- **Branco**: `#FFFFFF` (Superfície)

### Padrões
- Material Design 3
- Mobile-First
- Responsivo (cards mobile / table desktop)
- Touch-friendly (botões 48px+)

---

## 📋 Fase 1: MVP - Módulo Administrativo

### Objetivo
Permitir que federações gerenciem cadastro e filiação de academias.

### Escopo
1. ✅ Setup do projeto
2. ✅ Autenticação multi-tenant
3. ✅ CRUD de academias
4. ✅ Dashboard básico
5. ✅ Pagamentos (integração Safe2Pay)

### Fora do Escopo (Fases Futuras)
- ❌ Gestão de atletas (Fase 2)
- ❌ Sistema de eventos (Fase 3)
- ❌ Módulo educacional (Fase 4)
- ❌ Gestão comercial (Fase 5)

---

## 🏗️ Setup Inicial

### 1. Estrutura do Projeto

```
apps/titan/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── academias/
│   │   │   │   ├── page.tsx      # Lista
│   │   │   │   ├── nova/
│   │   │   │   └── [id]/
│   │   │   ├── atletas/
│   │   │   ├── financeiro/
│   │   │   └── configuracoes/
│   │   └── api/
│   │       ├── webhooks/
│   │       └── academias/
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layouts/
│   │   ├── forms/
│   │   └── cards/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── safe2pay/
│   │   └── utils/
│   ├── types/
│   └── styles/
└── supabase/
    ├── migrations/
    └── seed.sql
```

### 2. Dependências

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.0.10",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "lucide-react": "^0.292.0",
    "date-fns": "^2.30.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "typescript": "^5",
    "eslint": "^8",
    "prettier": "^3.1.0"
  }
}
```

---

## 🗄️ Schema do Banco (MVP)

### Tabelas Principais

```sql
-- 1. Federações (tenant)
CREATE TABLE federacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  sigla VARCHAR(10) NOT NULL UNIQUE,
  cnpj VARCHAR(18) UNIQUE,
  
  -- Contato
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  
  -- Endereço
  cep VARCHAR(9),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  
  -- Financeiro Safe2Pay
  safe2pay_token VARCHAR(255),
  taxa_anual_academia DECIMAL(10,2) DEFAULT 500.00,
  
  -- Branding
  cor_primaria VARCHAR(7) DEFAULT '#16A34A',
  cor_secundaria VARCHAR(7) DEFAULT '#DC2626',
  logo_url TEXT,
  
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Academias
CREATE TABLE academias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federacao_id UUID NOT NULL REFERENCES federacoes(id),
  
  -- Identificação
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('associacao', 'clube', 'pessoa_fisica')),
  nome_fantasia VARCHAR(255) NOT NULL,
  razao_social VARCHAR(255),
  cnpj VARCHAR(18),
  cpf VARCHAR(14),
  
  -- Contato
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  whatsapp VARCHAR(20),
  
  -- Endereço
  cep VARCHAR(9),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  
  -- Responsável Presidente
  presidente_nome VARCHAR(255),
  presidente_cpf VARCHAR(14),
  presidente_email VARCHAR(255),
  presidente_telefone VARCHAR(20),
  
  -- Responsável Técnico
  resp_tecnico_nome VARCHAR(255),
  resp_tecnico_cpf VARCHAR(14),
  resp_tecnico_email VARCHAR(255),
  resp_tecnico_certificacao VARCHAR(100),
  resp_tecnico_registro VARCHAR(50),
  
  -- Financeiro
  safe2pay_subscription_id VARCHAR(100),
  mensalidade_status VARCHAR(20) DEFAULT 'pendente',
  data_filiacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_vencimento_anualidade TIMESTAMP WITH TIME ZONE,
  
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Usuários com papéis (simplificado para MVP)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Tipo de papel
  role VARCHAR(50) NOT NULL,
  
  -- Contexto
  federacao_id UUID REFERENCES federacoes(id),
  academia_id UUID REFERENCES academias(id),
  
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Pagamentos (reutilizar estrutura do Profep Max)
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL, -- 'anualidade_academia', 'mensalidade_atleta'
  
  federacao_id UUID NOT NULL REFERENCES federacoes(id),
  academia_id UUID REFERENCES academias(id),
  
  -- Safe2Pay
  subscription_id VARCHAR(100),
  transaction_id VARCHAR(100),
  
  valor DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  metodo VARCHAR(20),
  
  cycle_number INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Log de eventos (webhook)
CREATE TABLE subscription_events (
  id BIGSERIAL PRIMARY KEY,
  subscription_id VARCHAR(100) NOT NULL,
  federacao_id UUID REFERENCES federacoes(id),
  academia_id UUID REFERENCES academias(id),
  
  event_type VARCHAR(50) NOT NULL,
  status_code INTEGER,
  amount DECIMAL(10,2),
  payload JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_academias_federacao ON academias(federacao_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_federacao ON user_roles(federacao_id);
CREATE INDEX idx_pagamentos_academia ON pagamentos(academia_id);
CREATE INDEX idx_subscription_events_subscription ON subscription_events(subscription_id);
```

### RLS Policies

```sql
-- Academias: Usuários veem apenas de sua federação
ALTER TABLE academias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see academies from their federation"
ON academias FOR SELECT
USING (
  federacao_id IN (
    SELECT federacao_id FROM user_roles 
    WHERE user_id = auth.uid() AND role IN ('federacao_admin', 'super_admin')
  )
  OR
  id IN (
    SELECT academia_id FROM user_roles
    WHERE user_id = auth.uid() AND role LIKE 'academia_%'
  )
);

-- Similar para outras tabelas...
```

---

## 🎯 Próximos Passos Imediatos

### 1. Inicializar Projeto Next.js
```bash
cd apps/titan
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```

### 2. Configurar Supabase
- Criar projeto Supabase específico para Titan
- Aplicar migrations
- Configurar variáveis de ambiente

### 3. Instalar shadcn/ui
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label select form
```

### 4. Criar Componentes Base
- Layout principal
- Sidebar/Header
- Cards de estatísticas
- Tabela de academias

### 5. Implementar Autenticação
- Login/Signup
- Middleware de proteção
- Identificação de papel (federação/academia)

---

## 📅 Timeline Estimado

- **Semana 1**: Setup + Auth + Layout
- **Semana 2**: CRUD Academias
- **Semana 3**: Dashboard + Financeiro
- **Semana 4**: Integração Safe2Pay + Testes
- **Semana 5**: Refinamento + Deploy

---

## 🚦 Pronto para Começar?

Podemos iniciar de 3 formas:

**Opção 1**: Começar do zero com setup completo
**Opção 2**: Criar projeto base e você testa localmente
**Opção 3**: Apenas criar migrations e você cuida do frontend

**Qual prefere?**
