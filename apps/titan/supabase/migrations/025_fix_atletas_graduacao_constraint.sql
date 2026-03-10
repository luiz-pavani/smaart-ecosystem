-- Migration 025: Fix atletas.graduacao constraint blocking inserts
--
-- Issue: Trigger/constraint validating graduacao against kyu_dan table is rejecting
-- valid values like 'BRANCA|MÚKYŪ' with error "Graduação inválida, cadastre em 
-- public.kyu_dan antes de usar"
--
-- Fix: Remove foreign key constraints and allow any VARCHAR value for graduacao

-- Drop any foreign key constraints on graduacao column
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'atletas'
          AND kcu.column_name = 'graduacao'
          AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
                      constraint_record.table_name, 
                      constraint_record.constraint_name);
    END LOOP;
END $$;

-- Drop any triggers that might be validating graduacao
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'atletas'
          AND trigger_name LIKE '%graduacao%'
          OR trigger_name LIKE '%kyu_dan%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON atletas', trigger_record.trigger_name);
    END LOOP;
END $$;

-- Ensure graduacao column accepts any text (VARCHAR without constraints)
-- This is already the case from migration 006, but we're confirming here
DO $$
BEGIN
    -- Check if column exists and is VARCHAR
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'atletas'
          AND column_name = 'graduacao'
          AND data_type = 'character varying'
    ) THEN
        -- Column is already VARCHAR, no action needed
        RAISE NOTICE 'Column atletas.graduacao is already VARCHAR - no changes needed';
    ELSE
        -- If somehow it's not VARCHAR, alter it
        ALTER TABLE atletas ALTER COLUMN graduacao TYPE VARCHAR(50);
        RAISE NOTICE 'Altered atletas.graduacao to VARCHAR(50)';
    END IF;
END $$;

-- Verification query (commented out - run manually if needed):
-- SELECT column_name, data_type, character_maximum_length, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'atletas' AND column_name = 'graduacao';
