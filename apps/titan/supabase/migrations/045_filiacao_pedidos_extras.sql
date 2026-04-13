-- Migration 045: add extra columns to filiacao_pedidos
ALTER TABLE filiacao_pedidos
  ADD COLUMN IF NOT EXISTS url_documento_id text,
  ADD COLUMN IF NOT EXISTS url_comprovante_pagamento text,
  ADD COLUMN IF NOT EXISTS dados_formulario jsonb;
