-- Migration 047: valor de inscrição em eventos

ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS valor_inscricao DECIMAL(10,2) DEFAULT 0;

ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS valor_pago DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS status CHECK (status IN ('confirmed', 'pending_payment', 'cancelled'));
