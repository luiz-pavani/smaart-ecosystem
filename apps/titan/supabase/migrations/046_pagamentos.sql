-- Migration 046: tabela pagamentos + campos safe2pay em academias/stakeholders

CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  referencia_tipo TEXT NOT NULL,  -- 'filiacao_pedido' | 'event_registration' | 'academia_anuidade' | 'profep'
  referencia_id UUID,
  safe2pay_id TEXT,               -- idTransaction (cobrança única) ou idSubscription (recorrente)
  tipo TEXT NOT NULL CHECK (tipo IN ('pix', 'cartao', 'recorrente')),
  valor DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'falhou', 'cancelado')),
  pix_qr_code TEXT,               -- payload EMV copia-e-cola
  pix_qr_code_url TEXT,           -- URL da imagem QR
  pix_expiracao TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pagamentos_stakeholder_idx ON pagamentos(stakeholder_id);
CREATE INDEX IF NOT EXISTS pagamentos_referencia_idx ON pagamentos(referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS pagamentos_safe2pay_idx ON pagamentos(safe2pay_id);
CREATE INDEX IF NOT EXISTS pagamentos_status_idx ON pagamentos(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_pagamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pagamentos_updated_at ON pagamentos;
CREATE TRIGGER pagamentos_updated_at
  BEFORE UPDATE ON pagamentos
  FOR EACH ROW EXECUTE FUNCTION update_pagamentos_updated_at();

-- Colunas Safe2Pay nas tabelas existentes
ALTER TABLE academias
  ADD COLUMN IF NOT EXISTS safe2pay_plan_id INTEGER,
  ADD COLUMN IF NOT EXISTS safe2pay_subscription_id TEXT;

ALTER TABLE stakeholders
  ADD COLUMN IF NOT EXISTS safe2pay_subscription_id TEXT;

-- RLS
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver seus próprios pagamentos
CREATE POLICY pagamentos_self_select ON pagamentos
  FOR SELECT
  USING (stakeholder_id = auth.uid());

-- Service role (backend/supabaseAdmin) tem acesso total sem RLS
