-- Tabela de controle de lotes por federação
CREATE TABLE IF NOT EXISTS federacao_lote_config (
  federacao_id  integer PRIMARY KEY,
  ano           integer NOT NULL,
  sequencia     integer NOT NULL DEFAULT 1,
  lote_atual    text GENERATED ALWAYS AS ('N' || ano::text || ' ' || sequencia::text) STORED,
  updated_at    timestamptz DEFAULT now()
);

-- Seed para LRSJ (federacao_id = 1), lote inicial N2026 1
INSERT INTO federacao_lote_config (federacao_id, ano, sequencia)
VALUES (1, 2026, 1)
ON CONFLICT (federacao_id) DO NOTHING;
