-- Migration 049: Registro individual de atleta pela academia
-- Ficha do atleta na academia (cadastro, dados marciais, responsável, comercial) e histórico de graduações.
-- Acesso só via API (service role) — RLS ligado sem policies.

CREATE TABLE IF NOT EXISTS academia_atleta_fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,

  -- Passo 1: identidade / acesso
  canal_acesso TEXT CHECK (canal_acesso IN ('email', 'whatsapp')),
  ativacao_enviada_em TIMESTAMPTZ,
  etapa TEXT NOT NULL DEFAULT 'cadastro'
    CHECK (etapa IN ('cadastro', 'filiacao', 'concluido')),

  -- Passo 2: dados de cadastro (opcionais, exceto responsável de menor)
  rg TEXT,                           -- CPF fica em stakeholders.cpf
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  contato_emergencia_nome TEXT,
  contato_emergencia_telefone TEXT,
  tipo_sanguineo TEXT,
  condicoes_saude JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ tipo, detalhe }] — ver CONDICOES_SAUDE em lib/registro/atleta.ts
  observacoes_saude TEXT,
  como_conheceu TEXT,

  -- Passo 3: dados marciais
  arte_marcial TEXT,
  graduacao_texto TEXT,              -- artes sem tabela kyu_dan
  data_ultima_graduacao DATE,

  -- Passo 2: responsável (obrigatório para menor de idade)
  responsavel_nome TEXT,
  responsavel_cpf TEXT,
  responsavel_telefone TEXT,
  responsavel_email TEXT,
  responsavel_parentesco TEXT,

  -- Passo 3: comercial
  plano_id UUID REFERENCES academia_planos(id) ON DELETE SET NULL,
  valor NUMERIC(10,2),
  parcelas INTEGER CHECK (parcelas BETWEEN 1 AND 24),
  forma_pagamento TEXT
    CHECK (forma_pagamento IN ('pix', 'boleto', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia')),
  dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
  data_inicio DATE,

  criado_por UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stakeholder_id, academia_id)
);

CREATE INDEX IF NOT EXISTS academia_atleta_fichas_academia_idx ON academia_atleta_fichas(academia_id, etapa);

CREATE TABLE IF NOT EXISTS graduacao_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  arte_marcial TEXT NOT NULL,
  kyu_dan_id BIGINT REFERENCES kyu_dan(id) ON DELETE SET NULL,
  graduacao_texto TEXT,
  data_graduacao DATE,
  entidade TEXT,                     -- quem outorgou (federação, academia, professor)
  criado_por UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (kyu_dan_id IS NOT NULL OR graduacao_texto IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS graduacao_historico_stakeholder_idx ON graduacao_historico(stakeholder_id, data_graduacao);

ALTER TABLE academia_atleta_fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduacao_historico ENABLE ROW LEVEL SECURITY;
