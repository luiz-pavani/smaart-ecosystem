-- Tabela para armazenar códigos OTP enviados via WhatsApp
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para buscas por telefone
CREATE INDEX IF NOT EXISTS idx_otp_verifications_telefone ON otp_verifications (telefone, used, expires_at);

-- Limpar OTPs expirados automaticamente (24h)
-- Pode ser feito via cron ou manualmente
