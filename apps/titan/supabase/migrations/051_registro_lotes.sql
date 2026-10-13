-- Migration 051: Registro de atletas em bloco
-- Um lote agrupa as fichas criadas de uma vez (planilha, foto de planilha manuscrita ou digitação),
-- para o professor retomar documentos e pagamento depois.

CREATE TABLE IF NOT EXISTS registro_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  criado_por UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  origem TEXT NOT NULL CHECK (origem IN ('planilha', 'foto', 'manual')),
  total_linhas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registro_lotes_academia_idx ON registro_lotes(academia_id, created_at DESC);
ALTER TABLE registro_lotes ENABLE ROW LEVEL SECURITY;

ALTER TABLE academia_atleta_fichas
  ADD COLUMN IF NOT EXISTS lote_id UUID REFERENCES registro_lotes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS academia_atleta_fichas_lote_idx ON academia_atleta_fichas(lote_id);

-- Federação escolhida para a ficha no lote (a filiação em si é o filiacao_pedidos criado na cobrança).
ALTER TABLE academia_atleta_fichas
  ADD COLUMN IF NOT EXISTS filiar_federacao_id UUID REFERENCES federacoes(id) ON DELETE SET NULL;
