-- ================================================================
-- MIGRATION 019: UNIVERSAL STAKEHOLDERS REGISTRY
-- ================================================================
-- Objetivo:
-- - Centralizar cadastro e login de federação, academia e atleta
-- - Gerar ID universal único para referência em tabelas de domínio
-- - Sincronizar automaticamente com auth.users (Supabase Auth)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLE: stakeholders (cadastro universal)
-- Campos solicitados: id, funcao, nome_completo, email, nome_usuario, senha
-- ================================================================
CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  funcao VARCHAR(20) NOT NULL CHECK (funcao IN ('FEDERACAO', 'ACADEMIA', 'ATLETA')),
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  nome_usuario VARCHAR(50) NOT NULL,
  senha TEXT
);

-- Nome de usuário único (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholders_nome_usuario_unique
  ON stakeholders (LOWER(nome_usuario));

-- ================================================================
-- RLS
-- ================================================================
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stakeholders select own" ON stakeholders;
CREATE POLICY "stakeholders select own"
  ON stakeholders FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "stakeholders update own" ON stakeholders;
CREATE POLICY "stakeholders update own"
  ON stakeholders FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "stakeholders insert own" ON stakeholders;
CREATE POLICY "stakeholders insert own"
  ON stakeholders FOR INSERT
  WITH CHECK (id = auth.uid());

-- ================================================================
-- Helpers para sincronizar auth.users -> stakeholders
-- ================================================================
CREATE OR REPLACE FUNCTION normalize_stakeholder_funcao(value TEXT)
RETURNS VARCHAR AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := UPPER(COALESCE(value, 'ATLETA'));

  IF normalized NOT IN ('FEDERACAO', 'ACADEMIA', 'ATLETA') THEN
    normalized := 'ATLETA';
  END IF;

  RETURN normalized::VARCHAR;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION upsert_stakeholder_from_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
BEGIN
  generated_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    'user_' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', '') FROM 1 FOR 12)
  );

  INSERT INTO stakeholders (
    id,
    funcao,
    nome_completo,
    email,
    nome_usuario,
    senha
  ) VALUES (
    NEW.id,
    normalize_stakeholder_funcao(NEW.raw_user_meta_data->>'stakeholder_role'),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NULLIF(NEW.email, ''), 'Usuário')
    ),
    NULLIF(NEW.email, ''),
    generated_username,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    funcao = normalize_stakeholder_funcao(COALESCE(EXCLUDED.funcao, stakeholders.funcao)),
    nome_completo = COALESCE(NULLIF(EXCLUDED.nome_completo, ''), stakeholders.nome_completo),
    email = COALESCE(EXCLUDED.email, stakeholders.email),
    nome_usuario = COALESCE(NULLIF(EXCLUDED.nome_usuario, ''), stakeholders.nome_usuario);

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Nome de usuário já existe. Escolha outro.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_create_stakeholder_from_auth_user ON auth.users;
CREATE TRIGGER trigger_create_stakeholder_from_auth_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION upsert_stakeholder_from_auth_user();

DROP TRIGGER IF EXISTS trigger_update_stakeholder_from_auth_user ON auth.users;
CREATE TRIGGER trigger_update_stakeholder_from_auth_user
AFTER UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW
EXECUTE FUNCTION upsert_stakeholder_from_auth_user();

-- ================================================================
-- Referência universal em tabelas de domínio existentes
-- ================================================================
ALTER TABLE federacoes
  ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL;

ALTER TABLE academias
  ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL;

ALTER TABLE atletas
  ADD COLUMN IF NOT EXISTS stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_federacoes_stakeholder_id_unique
  ON federacoes(stakeholder_id)
  WHERE stakeholder_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_academias_stakeholder_id_unique
  ON academias(stakeholder_id)
  WHERE stakeholder_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_atletas_stakeholder_id_unique
  ON atletas(stakeholder_id)
  WHERE stakeholder_id IS NOT NULL;
