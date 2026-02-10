-- Add federation scope field to cursos
ALTER TABLE public.cursos
ADD COLUMN IF NOT EXISTS federation_scope TEXT NOT NULL DEFAULT 'ALL';

-- Normalize existing rows
UPDATE public.cursos
SET federation_scope = 'ALL'
WHERE federation_scope IS NULL OR federation_scope = '';

-- Optional: add simple check constraint for known values (extend as needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cursos_federation_scope_check'
  ) THEN
    ALTER TABLE public.cursos
    ADD CONSTRAINT cursos_federation_scope_check
    CHECK (upper(federation_scope) IN ('ALL','LRSJ'));
  END IF;
END $$;
