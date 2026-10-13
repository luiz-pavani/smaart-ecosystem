-- Migration 050: Registro de atleta — filiação à federação (passos 4 e 5)
-- Taxas de filiação por federação/graduação (o servidor calcula o preço), verificação do documento
-- por IA, links de entrega dos documentos e bucket privado para documentos de identidade.

-- ─── Taxas de filiação ──────────────────────────────────────────────────────
-- Faixa de kyu_dan.id (inclusiva). kyu_dan_max NULL = sem teto. projeto_social=true é a tarifa reduzida.
CREATE TABLE IF NOT EXISTS federacao_taxas_filiacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federacao_id UUID NOT NULL REFERENCES federacoes(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  kyu_dan_min INTEGER NOT NULL,
  kyu_dan_max INTEGER,
  projeto_social BOOLEAN NOT NULL DEFAULT false,
  valor NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS federacao_taxas_filiacao_idx ON federacao_taxas_filiacao(federacao_id, ano);

-- Regimento LRSJ 2026 (mesmos valores de calcValor em portal/academia/filiacoes).
INSERT INTO federacao_taxas_filiacao (federacao_id, ano, kyu_dan_min, kyu_dan_max, projeto_social, valor, descricao)
SELECT '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d', 2026, v.mn, v.mx, v.ps, v.valor, v.descr
FROM (VALUES
  (1, 12, true,  95.00, 'Branca a marrom — projeto social'),
  (1, 12, false, 105.00, 'Branca a marrom'),
  (13, 13, false, 140.00, 'Shodan'),
  (14, 15, false, 120.00, 'Nidan / sandan'),
  (16, 17, false, 100.00, 'Yondan / godan'),
  (18, 22, false, 80.00, 'Kōdansha')
) AS v(mn, mx, ps, valor, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM federacao_taxas_filiacao
  WHERE federacao_id = '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d' AND ano = 2026
);

ALTER TABLE federacao_taxas_filiacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS federacao_taxas_filiacao_select ON federacao_taxas_filiacao;
CREATE POLICY federacao_taxas_filiacao_select ON federacao_taxas_filiacao FOR SELECT USING (true);

-- ─── Verificação do documento ───────────────────────────────────────────────
ALTER TABLE academia_atleta_fichas
  ADD COLUMN IF NOT EXISTS documento_path TEXT,              -- bucket privado documentos-identidade
  ADD COLUMN IF NOT EXISTS foto_url TEXT,                    -- foto do atleta (bucket público atletas)
  ADD COLUMN IF NOT EXISTS verificacao_status TEXT
    CHECK (verificacao_status IN ('aprovado', 'divergente', 'revisao_manual')),
  ADD COLUMN IF NOT EXISTS verificacao_documento JSONB,      -- extração da IA + comparação campo a campo
  ADD COLUMN IF NOT EXISTS verificado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS filiacao_pedido_id UUID REFERENCES filiacao_pedidos(id) ON DELETE SET NULL;

ALTER TABLE filiacao_pedidos
  ADD COLUMN IF NOT EXISTS verificacao_status TEXT
    CHECK (verificacao_status IN ('aprovado', 'divergente', 'revisao_manual')),
  ADD COLUMN IF NOT EXISTS verificacao_documento JSONB,
  ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ;

-- ─── Links de entrega dos documentos (certificado, carteira, back number) ────
CREATE TABLE IF NOT EXISTS documentos_entrega (
  token TEXT PRIMARY KEY,                                    -- aleatório, gerado na aplicação
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  federacao_id UUID NOT NULL REFERENCES federacoes(id) ON DELETE CASCADE,
  enviado_email_em TIMESTAMPTZ,
  enviado_whatsapp_em TIMESTAMPTZ,
  ultimo_acesso_em TIMESTAMPTZ,
  acessos INTEGER NOT NULL DEFAULT 0,
  expira_em TIMESTAMPTZ NOT NULL DEFAULT now() + interval '180 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documentos_entrega_stakeholder_idx ON documentos_entrega(stakeholder_id);
ALTER TABLE documentos_entrega ENABLE ROW LEVEL SECURITY;

-- ─── Bucket privado para documentos de identidade ───────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documentos-identidade', 'documentos-identidade', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;
