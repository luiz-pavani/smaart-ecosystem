-- Migration 044: filiacao_pedidos
-- Stores athlete affiliation requests that federation admins can approve/reject

CREATE TABLE IF NOT EXISTS filiacao_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  academia_id uuid REFERENCES academias(id) ON DELETE SET NULL,
  federacao_id uuid REFERENCES federacoes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO')),
  observacao text,
  revisado_por uuid REFERENCES stakeholders(id) ON DELETE SET NULL,
  revisado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stakeholder_id, federacao_id)
);

CREATE INDEX IF NOT EXISTS filiacao_pedidos_federacao_idx ON filiacao_pedidos(federacao_id, status);
CREATE INDEX IF NOT EXISTS filiacao_pedidos_stakeholder_idx ON filiacao_pedidos(stakeholder_id);
