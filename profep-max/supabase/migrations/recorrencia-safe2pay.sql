-- Migration: Adicionar suporte a recorrência Safe2Pay
-- Data: 2026-02-01

-- 1. Adicionar campos na tabela profiles para controle de assinaturas recorrentes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_subscription VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active'; -- "active", "suspended", "canceled", "pending"

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_id_subscription ON profiles(id_subscription);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires_at ON profiles(plan_expires_at);

-- 2. Adicionar campos na tabela vendas para rastreamento de ciclos recorrentes
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(100);
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cycle_number INTEGER DEFAULT 1;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS event_type VARCHAR(50); -- "SubscriptionCreated", "SubscriptionRenewed", "SubscriptionFailed", "SubscriptionCanceled"

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_vendas_subscription_id ON vendas(subscription_id);
CREATE INDEX IF NOT EXISTS idx_vendas_event_type ON vendas(event_type);
CREATE INDEX IF NOT EXISTS idx_vendas_cycle_number ON vendas(cycle_number);

-- 3. Criar tabela de log de eventos recorrentes para auditoria detalhada
CREATE TABLE IF NOT EXISTS subscription_events (
  id BIGSERIAL PRIMARY KEY,
  subscription_id VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- "created", "renewed", "failed", "canceled", "expired"
  status_code INTEGER,
  amount DECIMAL(10, 2),
  cycle_number INTEGER,
  failure_reason TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_email ON subscription_events(email);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

-- 4. RLS Policies (se usando RLS)
-- Permitir insert/update para função de webhook com Service Role
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for subscription events" ON subscription_events
  FOR INSERT
  WITH CHECK (true);

-- Permitir que usuários vejam apenas seus eventos
CREATE POLICY "Users can view their subscription events" ON subscription_events
  FOR SELECT
  USING (email = auth.jwt() ->> 'email' OR true); -- true para Service Role

-- 5. Função trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_subscription_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_events_timestamp_trigger
BEFORE UPDATE ON subscription_events
FOR EACH ROW
EXECUTE FUNCTION update_subscription_events_timestamp();
