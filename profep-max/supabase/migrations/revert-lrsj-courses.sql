-- SQL para reverter 2 cursos LRSJ para scope correto
-- Execute no Supabase SQL Editor

-- 1. Verificar cursos atuais com "Oficiais" ou "Lançamento"
SELECT id, titulo, federation_scope 
FROM cursos 
WHERE titulo ILIKE '%Oficiais%' OR titulo ILIKE '%Lançamento%Graduação%'
ORDER BY titulo;

-- 2. Atualizar para LRSJ (execute após verificar os IDs acima)
UPDATE cursos 
SET federation_scope = 'LRSJ' 
WHERE titulo ILIKE '%Oficiais de Competição 2026%' 
   OR titulo ILIKE '%Lançamento do Processo de Graduação 2026%';

-- 3. Verificar resultado
SELECT titulo, federation_scope 
FROM cursos 
WHERE federation_scope = 'LRSJ'
ORDER BY titulo;
