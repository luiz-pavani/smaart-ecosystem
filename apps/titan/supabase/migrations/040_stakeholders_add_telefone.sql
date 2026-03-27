-- Adiciona coluna telefone em stakeholders para auth via WhatsApp OTP
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS telefone TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholders_telefone ON stakeholders (telefone) WHERE telefone IS NOT NULL;
