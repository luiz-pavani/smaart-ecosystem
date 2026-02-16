-- =====================================================
-- TITAN - Esquema Inicial
-- Multi-tenant platform for Brazilian Jiu-Jitsu Federations
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FEDERAÇÕES (Tenant Root)
-- =====================================================
CREATE TABLE IF NOT EXISTS federacoes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  sigla VARCHAR(10) NOT NULL UNIQUE,
  cnpj VARCHAR(18) UNIQUE,
  
  -- Endereço
  endereco_rua VARCHAR(255),
  endereco_numero VARCHAR(20),
  endereco_complemento VARCHAR(100),
  endereco_bairro VARCHAR(100),
  endereco_cidade VARCHAR(100),
  endereco_estado VARCHAR(2),
  endereco_cep VARCHAR(9),
  
  -- Contato
  telefone VARCHAR(20),
  email VARCHAR(255),
  site VARCHAR(255),
  
  -- Safe2Pay Credentials (per-federation)
  safe2pay_token TEXT,
  safe2pay_signature_key TEXT,
  safe2pay_sandbox BOOLEAN DEFAULT true,
  
  -- Branding (Federation can customize colors)
  cor_primaria VARCHAR(7) DEFAULT '#16A34A', -- Verde LRSJ
  cor_secundaria VARCHAR(7) DEFAULT '#DC2626', -- Vermelho LRSJ
  logo_url TEXT,
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ACADEMIAS (Filiadas)
-- =====================================================
CREATE TABLE IF NOT EXISTS academias (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  federacao_id UUID NOT NULL REFERENCES federacoes(id) ON DELETE CASCADE,
  
  -- Dados da Entidade
  nome VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  sigla VARCHAR(3),
  cnpj VARCHAR(18),
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  logo_url TEXT,
  
  -- Endereço
  endereco_rua VARCHAR(255),
  endereco_numero VARCHAR(20),
  endereco_complemento VARCHAR(100),
  endereco_bairro VARCHAR(100),
  endereco_cidade VARCHAR(100),
  endereco_estado VARCHAR(2),
  endereco_cep VARCHAR(9),
  
  -- Responsável Principal
  responsavel_nome VARCHAR(255) NOT NULL,
  responsavel_cpf VARCHAR(14) NOT NULL,
  responsavel_rg VARCHAR(20),
  responsavel_telefone VARCHAR(20),
  responsavel_email VARCHAR(255) NOT NULL,
  responsavel_faixa VARCHAR(50), -- Ex: Preta 3º Grau
  
  -- Responsável Técnico (Opcional)
  tecnico_nome VARCHAR(255),
  tecnico_cpf VARCHAR(14),
  tecnico_registro_profissional VARCHAR(50), -- CREF ou similar
  tecnico_telefone VARCHAR(20),
  tecnico_email VARCHAR(255),
  
  -- Dados Operacionais
  data_filiacao DATE DEFAULT CURRENT_DATE,
  horario_funcionamento TEXT,
  quantidade_alunos INTEGER DEFAULT 0,
  
  -- Status de Pagamento
  anualidade_status VARCHAR(20) DEFAULT 'pendente', -- pendente, paga, vencida
  anualidade_vencimento DATE,
  safe2pay_subscription_id VARCHAR(100), -- ID da assinatura no Safe2Pay
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_academias_federacao ON academias(federacao_id);
CREATE INDEX IF NOT EXISTS idx_academias_responsavel_email ON academias(responsavel_email);
CREATE INDEX IF NOT EXISTS idx_academias_anualidade ON academias(anualidade_status, anualidade_vencimento);

-- =====================================================
-- USER ROLES (RBAC - One user, multiple roles)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role type: super_admin, federacao_admin, federacao_secretario, 
  --           academia_admin, professor, atleta, etc.
  role VARCHAR(50) NOT NULL,
  
  -- Context (which federation/academia this role applies to)
  federacao_id UUID REFERENCES federacoes(id) ON DELETE CASCADE,
  academia_id UUID REFERENCES academias(id) ON DELETE CASCADE,
  
  -- Permissions
  permissions JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, role, federacao_id, academia_id)
);

-- Índices para queries de autorização
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_federacao ON user_roles(federacao_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_academia ON user_roles(academia_id);

-- =====================================================
-- PAGAMENTOS (Safe2Pay transactions)
-- =====================================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  federacao_id UUID NOT NULL REFERENCES federacoes(id) ON DELETE CASCADE,
  academia_id UUID REFERENCES academias(id) ON DELETE SET NULL,
  
  -- Safe2Pay
  safe2pay_transaction_id VARCHAR(100) UNIQUE,
  safe2pay_subscription_id VARCHAR(100),
  
  -- Transaction details
  tipo VARCHAR(50) NOT NULL, -- anualidade_academia, mensalidade_atleta, taxa_evento, etc.
  valor DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL, -- pending, paid, failed, refunded
  metodo_pagamento VARCHAR(50), -- credit_card, boleto, pix
  
  -- Dates
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  data_pagamento TIMESTAMPTZ,
  data_vencimento DATE,
  
  -- Metadata
  descricao TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pagamentos_federacao ON pagamentos(federacao_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_academia ON pagamentos(academia_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_safe2pay ON pagamentos(safe2pay_transaction_id);

-- =====================================================
-- SUBSCRIPTION EVENTS (Webhook logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  federacao_id UUID NOT NULL REFERENCES federacoes(id) ON DELETE CASCADE,
  
  -- Safe2Pay webhook data
  event_type VARCHAR(100) NOT NULL, -- payment.created, payment.succeeded, payment.failed, etc.
  safe2pay_transaction_id VARCHAR(100),
  safe2pay_subscription_id VARCHAR(100),
  
  -- Raw webhook payload
  payload JSONB NOT NULL,
  
  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscription_events_federacao ON subscription_events(federacao_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_transaction ON subscription_events(safe2pay_transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_processed ON subscription_events(processed);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER federacoes_updated_at BEFORE UPDATE ON federacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER academias_updated_at BEFORE UPDATE ON academias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER pagamentos_updated_at BEFORE UPDATE ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Federações
ALTER TABLE federacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Federação admins can view their own federation"
  ON federacoes FOR SELECT
  USING (
    id IN (
      SELECT federacao_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'federacao_admin'
    )
  );

CREATE POLICY "Federação admins can update their own federation"
  ON federacoes FOR UPDATE
  USING (
    id IN (
      SELECT federacao_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'federacao_admin'
    )
  );

-- Academias
ALTER TABLE academias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Federação admins can view their academias"
  ON academias FOR SELECT
  USING (
    federacao_id IN (
      SELECT federacao_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('federacao_admin', 'federacao_secretario')
    )
  );

CREATE POLICY "Federação admins can insert academias"
  ON academias FOR INSERT
  WITH CHECK (
    federacao_id IN (
      SELECT federacao_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'federacao_admin'
    )
  );

CREATE POLICY "Federação admins can update their academias"
  ON academias FOR UPDATE
  USING (
    federacao_id IN (
      SELECT federacao_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('federacao_admin', 'federacao_secretario')
    )
  );

CREATE POLICY "Academia admins can view their own academia"
  ON academias FOR SELECT
  USING (
    id IN (
      SELECT academia_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'academia_admin'
    )
  );

-- User Roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Pagamentos
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Federação admins can view their payments"
  ON pagamentos FOR SELECT
  USING (
    federacao_id IN (
      SELECT federacao_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('federacao_admin', 'federacao_secretario', 'federacao_financeiro')
    )
  );

-- Subscription Events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Federação admins can view their events"
  ON subscription_events FOR SELECT
  USING (
    federacao_id IN (
      SELECT federacao_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'federacao_admin'
    )
  );

-- =====================================================
-- SEED DATA (Optional - for development)
-- =====================================================

-- Comentar para produção
-- INSERT INTO federacoes (nome, sigla, email, cor_primaria, cor_secundaria) VALUES
--   ('Liga Riograndense de Judô', 'LRSJ', 'contato@lrsj.com.br', '#16A34A', '#DC2626');
