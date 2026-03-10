-- ============================================================
-- Migration 036: Fix FK stakeholder_id ON DELETE → RESTRICT
-- ============================================================
-- Context: In migration 035, stakeholder_id became the PRIMARY KEY
-- of user_fed_lrsj (NOT NULL). However, the FK pointing to
-- stakeholders(id) still has ON DELETE SET NULL, which would
-- violate the NOT NULL constraint if the parent row were deleted.
-- This migration changes it to ON DELETE RESTRICT (safer).
-- ============================================================

DO $$
BEGIN
  -- Only proceed if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_fed_lrsj'
  ) THEN
    RAISE NOTICE 'Table user_fed_lrsj not found, skipping.';
    RETURN;
  END IF;

  -- Check current ON DELETE behavior of the FK
  IF EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'user_fed_lrsj'
      AND rc.unique_constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'stakeholders' AND constraint_type = 'PRIMARY KEY'
      )
      AND rc.delete_rule = 'SET NULL'
  ) THEN
    -- Drop the old FK with SET NULL
    ALTER TABLE public.user_fed_lrsj
      DROP CONSTRAINT IF EXISTS user_fed_lrsj_stakeholder_id_fkey;

    -- Re-add with RESTRICT (prevents orphaning the PK)
    ALTER TABLE public.user_fed_lrsj
      ADD CONSTRAINT user_fed_lrsj_stakeholder_id_fkey
      FOREIGN KEY (stakeholder_id)
      REFERENCES public.stakeholders(id)
      ON DELETE RESTRICT;

    RAISE NOTICE 'FK user_fed_lrsj_stakeholder_id_fkey updated: SET NULL → RESTRICT';
  ELSE
    RAISE NOTICE 'FK already has RESTRICT or not found with SET NULL, no change made.';
  END IF;
END $$;

-- Verify result
SELECT
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'user_fed_lrsj'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name = 'user_fed_lrsj_stakeholder_id_fkey';
