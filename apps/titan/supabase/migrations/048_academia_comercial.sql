-- Migration 048: Área Comercial da Academia
-- Planos/mensalidades, cupons de desconto, credenciais Safe2Pay por academia

-- ─── Credenciais Safe2Pay individualizadas por academia ─────────────────────
ALTER TABLE academias
  ADD COLUMN IF NOT EXISTS safe2pay_api_key TEXT,
  ADD COLUMN IF NOT EXISTS safe2pay_api_secret TEXT,
  ADD COLUMN IF NOT EXISTS safe2pay_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS pagamento_habilitado BOOLEAN NOT NULL DEFAULT false;

-- ─── Planos/Mensalidades da academia ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academia_planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,                     -- ex: "Mensal Adulto", "Trimestral Kids"
  descricao TEXT,
  valor DECIMAL(10,2) NOT NULL,
  valor_original DECIMAL(10,2),           -- para exibir "de/por" quando houver desconto
  periodicidade TEXT NOT NULL DEFAULT 'mensal'
    CHECK (periodicidade IN ('mensal', 'trimestral', 'semestral', 'anual', 'avulso')),
  duracao_meses INTEGER,                  -- null = recorrente infinito
  max_aulas_semana INTEGER,               -- null = ilimitado
  beneficios TEXT[],                      -- ex: ARRAY['Judô','Luta Livre','Musculação']
  ativo BOOLEAN NOT NULL DEFAULT true,
  destaque BOOLEAN NOT NULL DEFAULT false, -- plano em destaque na vitrine
  ordem INTEGER NOT NULL DEFAULT 0,
  safe2pay_plan_id TEXT,                  -- id do plano no Safe2Pay (criado automaticamente)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academia_planos_academia_idx ON academia_planos(academia_id);

-- ─── Cupons de desconto ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academia_cupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,                   -- ex: "PROMO10", "BLACKFRIDAY"
  descricao TEXT,
  tipo_desconto TEXT NOT NULL DEFAULT 'percentual'
    CHECK (tipo_desconto IN ('percentual', 'fixo')),
  valor_desconto DECIMAL(10,2) NOT NULL,  -- % ou R$ dependendo do tipo
  valor_minimo DECIMAL(10,2),             -- valor mínimo do plano para aplicar
  plano_ids UUID[],                       -- null = todos os planos, ou lista específica
  uso_maximo INTEGER,                     -- null = ilimitado
  uso_atual INTEGER NOT NULL DEFAULT 0,
  validade_inicio TIMESTAMPTZ,
  validade_fim TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academia_cupons_academia_idx ON academia_cupons(academia_id);
CREATE UNIQUE INDEX IF NOT EXISTS academia_cupons_codigo_unique ON academia_cupons(academia_id, UPPER(codigo));

-- ─── Assinaturas de alunos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academia_assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  plano_id UUID NOT NULL REFERENCES academia_planos(id) ON DELETE RESTRICT,
  cupom_id UUID REFERENCES academia_cupons(id),
  valor DECIMAL(10,2) NOT NULL,
  valor_desconto DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'cancelada', 'suspensa', 'vencida')),
  safe2pay_subscription_id TEXT,
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_proximo_vencimento TIMESTAMPTZ,
  data_cancelamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academia_assinaturas_academia_idx ON academia_assinaturas(academia_id);
CREATE INDEX IF NOT EXISTS academia_assinaturas_stakeholder_idx ON academia_assinaturas(stakeholder_id);

-- ─── Triggers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_academia_comercial_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS academia_planos_updated ON academia_planos;
CREATE TRIGGER academia_planos_updated
  BEFORE UPDATE ON academia_planos FOR EACH ROW
  EXECUTE FUNCTION update_academia_comercial_updated_at();

DROP TRIGGER IF EXISTS academia_cupons_updated ON academia_cupons;
CREATE TRIGGER academia_cupons_updated
  BEFORE UPDATE ON academia_cupons FOR EACH ROW
  EXECUTE FUNCTION update_academia_comercial_updated_at();

DROP TRIGGER IF EXISTS academia_assinaturas_updated ON academia_assinaturas;
CREATE TRIGGER academia_assinaturas_updated
  BEFORE UPDATE ON academia_assinaturas FOR EACH ROW
  EXECUTE FUNCTION update_academia_comercial_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE academia_planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE academia_cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE academia_assinaturas ENABLE ROW LEVEL SECURITY;

-- Planos: visíveis por todos (vitrine pública), editáveis pela academia
CREATE POLICY academia_planos_select ON academia_planos FOR SELECT USING (true);

-- Cupons: visíveis pela academia
CREATE POLICY academia_cupons_select ON academia_cupons FOR SELECT USING (true);

-- Assinaturas: aluno vê as suas, academia vê todas dela
CREATE POLICY academia_assinaturas_self ON academia_assinaturas
  FOR SELECT USING (stakeholder_id = auth.uid());
