-- Add free access flag to cursos
ALTER TABLE public.cursos
ADD COLUMN IF NOT EXISTS gratuito BOOLEAN NOT NULL DEFAULT false;

-- Normalize existing rows
UPDATE public.cursos
SET gratuito = false
WHERE gratuito IS NULL;
