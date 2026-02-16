-- =====================================================
-- Add logo_url and sigla columns to academias table
-- =====================================================

-- Add sigla column (3-letter abbreviation)
ALTER TABLE academias 
ADD COLUMN IF NOT EXISTS sigla VARCHAR(3);

-- Add logo_url column
ALTER TABLE academias 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN academias.sigla IS 'Sigla de 3 letras da academia (ex: AJP, GFT)';
COMMENT ON COLUMN academias.logo_url IS 'URL da logo da academia, exibida automaticamente no perfil';
