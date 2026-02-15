# 🏛️ TITAN - Ecossistema Completo de Gestão Esportiva

## Visão Geral

Plataforma unificada multi-tenant para gestão completa do ecossistema do judô, integrando 4 verticais:
1. **ADMINISTRATIVA** - Hierarquia organizacional e cadastros
2. **EVENTOS** - Competições, inscrições, súmulas (tipo Smoothcomp)
3. **EDUCACIONAL** - Cursos, graduações, certificações
4. **COMERCIAL** - Gestão de negócios das academias

---

## 1. Estrutura Hierárquica

### Hierarquia Administrativa (Vertical)
```
CONFEDERAÇÃO (Nacional/Internacional)
  └── FEDERAÇÃO (Estadual - LRSJ, FPJ, etc)
       └── ACADEMIA (Local)
            └── ATLETA (Individual)
```

### Papéis e Perfis do Sistema
```
👤 USUÁRIO BASE (auth.users)
  ├── Atleta
  ├── Professor
  ├── Auxiliar Técnico
  ├── Responsável Técnico
  ├── Dirigente (Federação/Academia)
  ├── Organizador (Eventos)
  └── Staff (Apoio)
```

Cada usuário pode ter **múltiplos papéis simultaneamente**.
Exemplo: Um usuário pode ser Professor na Academia X + Organizador de eventos + Atleta ativo.

### Verticais Interconectadas

#### 1.1 ADMINISTRATIVA (Fase 1 - Agora)
Gestão da estrutura organizacional:
- Cadastros de entidades
- Filiações e anuidades
- Documentação e certificações
- Hierarquia de acesso

#### 1.2 EVENTOS (Fase 2)
Sistema competitivo (tipo Smoothcomp):
- Criação e gestão de campeonatos
- Inscrições e pagamentos
- Chaveamento automático
- Súmulas eletrônicas
- Placares ao vivo
- Ranking automático

#### 1.3 EDUCACIONAL (Fase 3)
Gestão de conhecimento:
- Cursos e certificações
- Exames de graduação
- Biblioteca de conteúdo
- Histórico de formação
- (Integração com Profep Max)

#### 1.4 COMERCIAL (Fase 4)
Gestão de negócios:
- CRM para academias
- Controle de mensalidades
- Relatórios financeiros
- Marketing e captação
- Gestão de estoque (kimono, faixas)

---

## 2. Arquitetura de Dados

### Sistema de Permissões RBAC (Role-Based Access Control)

```typescript
// Papéis base do sistema
enum Role {
  // Administrativo
  SUPER_ADMIN = 'super_admin',           // Confederação
  FEDERACAO_ADMIN = 'federacao_admin',   // Dirigente federação
  ACADEMIA_ADMIN = 'academia_admin',     // Presidente/dono academia
  ACADEMIA_SECRETARIA = 'academia_secretaria',
  
  // Técnico
  RESPONSAVEL_TECNICO = 'responsavel_tecnico',
  AUXILIAR_TECNICO = 'auxiliar_tecnico',
  PROFESSOR = 'professor',
  
  // Eventos
  ORGANIZADOR_EVENTO = 'organizador_evento',
  ARBITRO = 'arbitro',
  MESARIO = 'mesario',
  
  // Base
  ATLETA = 'atleta',
  RESPONSAVEL_LEGAL = 'responsavel_legal',  // Para atletas menores
  
  // Comercial
  GESTOR_COMERCIAL = 'gestor_comercial',
}

// Permissões granulares
interface Permission {
  resource: string;     // Ex: 'academias', 'atletas', 'eventos'
  actions: string[];    // Ex: ['create', 'read', 'update', 'delete']
  scope: 'own' | 'academia' | 'federacao' | 'all';
}

// Mapeamento Role → Permissions
const rolePermissions: Record<Role, Permission[]> = {
  [Role.FEDERACAO_ADMIN]: [
    { resource: 'academias', actions: ['*'], scope: 'federacao' },
    { resource: 'atletas', actions: ['read', 'update'], scope: 'federacao' },
    { resource: 'eventos', actions: ['*'], scope: 'federacao' },
    { resource: 'pagamentos', actions: ['read'], scope: 'federacao' },
  ],
  [Role.ACADEMIA_ADMIN]: [
    { resource: 'academia', actions: ['*'], scope: 'own' },
    { resource: 'atletas', actions: ['*'], scope: 'academia' },
    { resource: 'professores', actions: ['*'], scope: 'academia' },
    { resource: 'pagamentos', actions: ['read', 'create'], scope: 'academia' },
  ],
  [Role.PROFESSOR]: [
    { resource: 'atletas', actions: ['read', 'update'], scope: 'academia' },
    { resource: 'aulas', actions: ['*'], scope: 'own' },
  ],
  [Role.ATLETA]: [
    { resource: 'perfil', actions: ['read', 'update'], scope: 'own' },
    { resource: 'eventos', actions: ['read'], scope: 'all' },
    { resource: 'inscricoes', actions: ['create'], scope: 'own' },
  ],
  // ... outros papéis
};
```

### Entidades Principais

#### 2.1 Confederação (Tenant Root - Opcional para MVP)
```typescript
interface Confederacao {
  id: string;
  nome: string;              // "Confederação Brasileira de Judô"
  sigla: string;             // "CBJ"
  cnpj: string;
  escopo: 'nacional' | 'internacional';
  
  // Configurações globais
  safe2pay_master_account?: string;
  
  status: 'active' | 'inactive';
  created_at: timestamp;
}
```

#### 2.2 Federações (Tenant Principal)
```typescript
interface Federacao {
  id: string;
  nome: string;           // "Liga Regional de Judô"
  sigla: string;          // "LRSJ"
  cnpj: string;
  
  // Contato
  email: string;
  telefone: string;
  endereco: Endereco;
  2.4 Usuários e Papéis (RBAC Multi-tenant)
```typescript
// Tabela central de usuários (Supabase Auth)
interface User {
  id: string;                     // UUID do Supabase Auth
  email: string;
  
  // Dados pessoais (usados em todos os contextos)
  nome_completo: string;
  cpf: string;
  data_nascimento: Date;
  telefone: string;
  foto_url?: string;
  
  created_at: timestamp;
}

// Papéis de um usuário (pode ter múltiplos)
interface UserRole {
  id: string;
  user_id: string;                // FK para auth.users
  role: Role;                     // Enum de papéis
  
  // Contexto do papel
  federacao_id?: string;          // Se papel é dentro de uma federação
  academia_id?: string;           // Se papel é dentro de uma academia
  
  // Metadados específicos do papel
  metadata: {
    // Para professores/técnicos
    certificacao?: string;
    numero_registro?: string;
    data_validade?: timestamp;
    
    // Para atletas
    faixa_atual?: string;
    categoria_peso?: string;
    
    // Para dirigentes
    cargo?: string;
    mandato_inicio?: timestamp;
    mandato_fim?: timestamp;
  };
  
  status: 'active' | 'suspended' | 'inactive';
  created_at: timestamp;
}

// View helper para buscar papéis de um usuário
CREATE VIEW user_roles_view AS
SELECT 
  ur.*,
  u.nome_completo,
  u.email,
  f.nome as federacao_nome,
  a.nome_fantasia as academia_nome
FROM user_roles ur
JOIN users u ON u.id = ur.user_id
LEFT JOIN federacoes f ON f.id = ur.federacao_id
LEFT JOIN academias a ON a.id = ur.academia_id;
```

#### 2.5 Vínculo Academia-Usuário (Relacionamento N:N)
```typescript
// Um usuário pode estar vinculado a múltiplas academias
// Uma academia tem múltiplos usuários com diferentes papéis
interface AcademiaUsuario {
  id: string;
  academia_id: string;
  user_id: string;
  
  // Papéis dentro desta academia
  roles: Role[];                  // ['professor', 'auxiliar_tecnico']
  
  // Status do vínculo
  data_vinculo: timestamp;
  data_desvinculo?: timestamp;
  status: 'active' | 'inactive'
```

#### 1.2 Academias Filiadas
```typescript
interface Academia {
  id: string;
  federacao_id: string;           // Foreign key
  
  // Identificação
  tipo: 'associacao' | 'clube' | 'pessoa_fisica';
  nome_fantasia: string;
  razao_social?: string;          // Opcional para PF
  cnpj?: string;                  // Obrigatório para PJ
  cpf?: string;                   // Obrigatório para PF
  
  // Contato
  email: string;
  telefone: string;
  whatsapp?: string;
  site?: string;
  endereco: Endereco;
  
  // Responsáveis
  presidente: Responsavel;
  responsavel_tecnico: ResponsavelTecnico;
  auxiliares_tecnicos: ResponsavelTecnico[];
  
  // Financeiro
  mensalidade_status: 'em_dia' | 'atrasado' | 'inadimplente';
  data_filiacao: timestamp;
  data_vencimento_anualidade: timestamp;
  
  // Acesso
  perfil_principal_user_id: string;  // User principal da academia
  
  status: 'active' | 'suspended' | 'inactive';
  created_at: timestamp;
  updated_at: timestamp;
}

interface Responsavel {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cargo?: string;
}

interface ResponsavelTecnico extends Responsavel {
  certificacao: string;           // Ex: "Faixa Preta 5º Dan"
  numero_registro?: string;       // Registro na federação
  data_validade_certificado?: timestamp;
}

interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}
```

#### 1.3 Usuários da Academia (Multi-perfil)
```typescript
interface AcademiaUser {
  id: string;
  academia_id: string;
  user_id: string;                // Foreign key para auth.users
  
  nivel_acesso: 'admin' | 'secretaria' | 'tecnico' | 'visualizador';
  
  permissoes: {
    gerenciar_cadastros: boolean;
    gerenciar_pagamentos: boolean;
    gerenciar_atletas: boolean;
    visualizar_relatorios: boolean;
  };
  
  created_at: timestamp;
}
```

#### 1.4 Atletas (Preview - detalhamento posterior)
### Filosofia: Material Design 3 + Mobile-First

**Inspiração: Material Design 3 (Material You) com cores neutras configuráveis**
  academia_id: string;
  
  // Dados pessoais
  nome: string;
  cpf: string;
  data_nascimento: Date;
  sexo: 'M' | 'F';
  
  // Graduação
  faixa_atual: string;
  data_ultima_graduacao: timestamp;
  
  // Financeiro
  mensalidade_status: 'em_dia' | 'atrasado';
  
  status: 'active' | 'inactive';
  created_at: timestamp;
}
```

#### 1.5 Pagamentos
```typescript
interface Pagamento {
  id: string;
  tipo: 'anualidade_academia' | 'mensalidade_atleta';
  
  // Relacionamento
  federacao_id: string;
  academia_id?: string;
  atleta_id?: string;
  
  // Safe2Pay
  subscription_id?: string;       // Para recorrência
  transaction_id: string;
  
  // Valores
  valor: number;
  status: 'pending' | 'approved' | 'refused' | 'canceled';
  metodo: 'cartao' | 'boleto' | 'pix';
  
  // Ciclo (para recorrência)
  cycle_number: number;
  
  created_at: timestamp;
}
```

---

## 2. Sistema de Multi-Tenant

### Isolamento de Dados
```sql
-- Row Level Security (RLS) por federação
CREATE POLICY "Usuarios veem apenas sua federacao"
ON academias FOR SELECT
USING (
  federacao_id IN (
    SELECT federacao_id FROM usuarios_federacao 
    WHERE user_id = auth.uid()
  )
);

-- Usuários da academia veem apenas seus dados
CREATE POLICY "Usuarios veem apenas sua academia"
ON atletas FOR SELECT
USING (
  academia_id IN (
    SELECT academia_id FROM academia_users 
    WHERE user_id = auth.uid()
  )
);
```

### Fluxo de Acesso
```
1. USER LOGIN → Identifica papel (federação ou academia)
2. Se FEDERAÇÃO → Acesso completo a todas academias
3. Se ACADEMIA → Acesso apenas à sua academia e atletas
4. Permissões granulares por nível de acesso
```

---

## 3. Sistema de Pagamentos

### Integração Safe2Pay

#### 3.1 Conta por Federação
- Cada federação tem sua própria conta Safe2Pay
- Token e credenciais armazenados na tabela `federacoes`
- Split de pagamentos não necessário (cada federação recebe diretamente)

#### 3.2 Tipos de Cobrança

**Anualidade da Academia**
```typescript
// Cobrança anual recorrente
const subscriptionAcademia = {
  amount: 500.00,          // Define pela federação
  frequency: 'yearly',
  startDate: dataFiliacao,
  description: 'Anualidade Academia XYZ',
  customer: {
    email: academia.email,
    name: academia.nome_fantasia
  }
};
```

**Mensalidade do Atleta**
```typescript
// Cobrança mensal recorrente
const subscriptionAtleta = {
  amount: 15.00,           // Define pela federação
  frequency: 'monthly',
  startDate: dataFiliacao,
  description: 'Mensalidade Atleta João Silva',
  customer: {
    email: atleta.email,
    name: atleta.nome
  }
};
```

#### 3.3 Webhooks (Aprendizado do Profep Max)
```
Endpoint: https://titan.smaart.pro/api/webhooks/safe2pay/:federacao_id

Eventos:
- SubscriptionPaymentApproved → Ativa/Renova acesso
- SubscriptionPaymentRefused → Suspende acesso
- SubscriptionCanceled → Cancela assinatura
- SubscriptionSuspended → Suspende temporariamente
```

---

## 4. UX/UI - Design System

### Filosofia: Minimalismo Funcional

**Inspiração: Dieter Rams + Johnny Ive + Mobile-First**

#### Princípios de Design

1. **Material Design 3**
   - Superfícies e elevações
   - Motion design fluido
   - Estados interativos claros
   - Acessibilidade first

2. **Personalização por Federação**
   - Cores primária/secundária configuráveis
   - Logo da federação
   - Tema adaptativo (light/dark)

3. **Touch-First**
   - Botões FAB (Floating Action Button)
   - Bottom sheets (mobile)
   - Swipe gestures
   - Ripple effects

#### Componentes Base

```typescript
// Design Tokens
const theme = {
  colors: {
    primary: '#1A1A1A',      // Quase preto
    secondary: '#4A5568',    // Cinza escuro
    accent: '#3B82F6',       // Azul para CTAs
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: '#FFFFFF',
    surface: '#F9FAFB',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  typography: {
    fontFamily: {
      sans: '"Inter", system-ui, sans-serif',  // Clean e legível
      mono: '"JetBrains Mono", monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
    },
  },
  
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
};
```

#### Estrutura Visual

```
┌─────────────────────────────────────┐
│  [Logo]              [Avatar ▾]     │  Header (fixo)
├─────────────────────────────────────┤
│                                     │
│  👋 Olá, Academia Bushido           │  Hero Section
│  📊 3 ações pendentes               │  (resumo rápido)
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌───────┐  ┌───────┐  ┌───────┐  │  Cards de Ação
│  │  🏢   │  │  👥   │  │  💰   │  │  (grandes, touch-friendly)
│  │Acade- │  │Atle-  │  │Paga-  │  │
│  │mia    │  │tas    │  │mentos │  │
│  └───────┘  └───────┘  └───────┘  │
│                                     │
│  ┌─────────────────────────────┐  │  Lista/Tabela
│  │ Academia Exemplo            │  │  (cards em mobile,
│  │ Status: ✅ Em dia           │  │   table em desktop)
│  │ 45 atletas                  │  │
│  └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

#### Padrões de Interação

**1. Navegação Simplificada**
```
Desktop: Sidebar colapsável
Mobile: Bottom navigation bar (iOS style)

Seções:
🏠 Início
🏢 Academias
👥 Atletas
💰 Financeiro
📊 Relatórios
⚙️ Configurações
```

**2. Formulários Touch-Friendly**
```tsx
<Input
  label="Nome da Academia"
  size="lg"              // 48px height
  icon={<Building />}
  helper="Nome que aparecerá no certificado"
/>

<Select
  label="Tipo de Entidade"
  options={[...]}
  size="lg"
  searchable           // Busca inline
/>
```

**3. Feedback Visual Imediato**
```tsx
// Loading states
<Button loading>Salvando...</Button>

// Success feedback
<Toast type="success">Academia cadastrada!</Toast>

// Skeleton screens (enquanto carrega)
<CardSkeleton />
```

**4. Gestos Mobile**
```
- Pull to refresh (atualizar lista)
- Swipe left (ações rápidas: editar, excluir)
- Long press (menu contextual)
- Tap fora (fechar modal)
```

---

## 5. Stack Tecnológica

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui (componentes acessíveis)
- **State**: Zustand (simples e performático)
- **Forms**: React Hook Form + Zod (validação)
- **Icons**: Lucide React (consistente e leve)

### Backend
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth (multi-tenant)
- **Storage**: Supabase Storage (docs, logos)
- **API**: Next.js API Routes
- **Payments**: Safe2Pay API

### Deploy
- **Hosting**: Vercel
- **Domain**: titan.smaart.pro

---

## 6. Roadmap de Implementação

### Fase 1: Fundação (2 semanas)
- [ ] Setup do projeto Next.js + Tailwind
- [ ] Design System básico (componentes)
- [ ] Schema do banco (migrations)
- [ ] Auth multi-tenant
- [ ] RLS policies

### Fase 2: Gestão de Academias (2 semanas)
- [ ] CRUD de academias
- [ ] Cadastro de responsáveis
- [ ] Upload de documentos
- [ ] Dashboard da academia
- [ ] Níveis de acesso/permissões

### Fase 3: Pagamentos (2 semanas)
- [ ] Integração Safe2Pay
- [ ] Assinaturas recorrentes
- [ ] Webhooks
- [ ] Histórico de pagamentos
- [ ] Dashboard financeiro

### Fase 4: Gestão de Atletas (2 semanas)
- [ ] CRUD de atletas
- [ ] Pagamentos de mensalidades
- [ ] Controle de graduações
- [ ] Relatórios

### Fase 5: Refinamento (1 semana)
- [ ] Testes e2e
- [ ] Performance optimization
- [ ] Documentação
- [ ] Deploy produção

---

## 7. Próximos Passos Imediatos

1. **Validar arquitetura** com você
2. **Definir palette de cores** (sugestão ou usar cores da federação)
3. **Criar protótipo visual** (Figma? ou direto no código?)
4. **Setup inicial do projeto**
5. **Primeira migration** (tabelas base)

---

**O que você acha dessa arquitetura?** 

Pontos para discutir:
- O modelo de dados faz sentido para o fluxo da federação?
- Preferência de UI: mais iOS (rounded, sombras suaves) ou mais Android Material (flat, geométrico)?
- Começamos por qual módulo? (Sugestão: Gestão de Academias)
- Quer ver um protótipo visual antes de começar a codar?
