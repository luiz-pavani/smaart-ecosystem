-- ================================================================
-- MIGRATION 023: STAKEHOLDER FINAL LOCK (AUTO-CONDITIONAL)
-- ================================================================
-- Objetivo:
-- - Validar constraints graduais criadas na 022
-- - Aplicar NOT NULL em stakeholder_id apenas quando não houver gaps
-- - Operação segura e idempotente

DO $$
DECLARE
  federacoes_gap BIGINT;
  academias_gap BIGINT;
  atletas_gap BIGINT;
BEGIN
  SELECT COUNT(*) INTO federacoes_gap FROM federacoes WHERE stakeholder_id IS NULL;
  SELECT COUNT(*) INTO academias_gap FROM academias WHERE stakeholder_id IS NULL;
  SELECT COUNT(*) INTO atletas_gap FROM atletas WHERE stakeholder_id IS NULL;

  -- Federação
  IF federacoes_gap = 0 THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'federacoes'
        AND c.conname = 'ck_federacoes_stakeholder_required'
    ) THEN
      ALTER TABLE federacoes VALIDATE CONSTRAINT ck_federacoes_stakeholder_required;
    END IF;

    ALTER TABLE federacoes ALTER COLUMN stakeholder_id SET NOT NULL;
    RAISE NOTICE 'federacoes: lock final aplicado (NOT NULL).';
  ELSE
    RAISE NOTICE 'federacoes: lock final não aplicado (gaps=%).', federacoes_gap;
  END IF;

  -- Academia
  IF academias_gap = 0 THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'academias'
        AND c.conname = 'ck_academias_stakeholder_required'
    ) THEN
      ALTER TABLE academias VALIDATE CONSTRAINT ck_academias_stakeholder_required;
    END IF;

    ALTER TABLE academias ALTER COLUMN stakeholder_id SET NOT NULL;
    RAISE NOTICE 'academias: lock final aplicado (NOT NULL).';
  ELSE
    RAISE NOTICE 'academias: lock final não aplicado (gaps=%).', academias_gap;
  END IF;

  -- Atleta
  IF atletas_gap = 0 THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'atletas'
        AND c.conname = 'ck_atletas_stakeholder_required'
    ) THEN
      ALTER TABLE atletas VALIDATE CONSTRAINT ck_atletas_stakeholder_required;
    END IF;

    ALTER TABLE atletas ALTER COLUMN stakeholder_id SET NOT NULL;
    RAISE NOTICE 'atletas: lock final aplicado (NOT NULL).';
  ELSE
    RAISE NOTICE 'atletas: lock final não aplicado (gaps=%).', atletas_gap;
  END IF;
END;
$$;
