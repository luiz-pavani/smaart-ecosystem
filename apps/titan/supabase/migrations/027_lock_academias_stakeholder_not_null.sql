-- Migration 027: Lock final em academias.stakeholder_id
-- Objetivo: aplicar NOT NULL agora que missing_stakeholder_id = 0

DO $$
DECLARE
  academias_gap BIGINT;
BEGIN
  SELECT COUNT(*) INTO academias_gap
  FROM academias
  WHERE stakeholder_id IS NULL;

  IF academias_gap = 0 THEN
    -- Garante validação do check constraint se existir
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
    RAISE NOTICE 'academias: stakeholder_id definido como NOT NULL.';
  ELSE
    RAISE EXCEPTION 'Não é possível aplicar NOT NULL. Existem % registros com stakeholder_id NULL em academias.', academias_gap;
  END IF;
END;
$$;
