-- ============================================================
-- MIGRATION: Criar academias faltantes identificadas na auditoria
-- 
-- Academias: "Dojo Cáceres Moraes" e "Garra Team"
-- Total de atletas afetados: 5 (4 + 1)
-- Data: 2026-03-02
-- ============================================================

-- Verificar se academias já existem
SELECT 'Academias existentes para adicionar:' AS status;
SELECT * FROM public.academias 
WHERE nome ILIKE 'dojo cáceres%' OR nome ILIKE 'garra%' OR sigla IN ('DCM', 'GAR');

-- Inserir: Dojo Cáceres Moraes (4 atletas)
INSERT INTO public.academias (sigla, nome, federacao_id, status, observacoes)
VALUES (
  'DCM',
  'Dojo Cáceres Moraes',
  '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d',  -- Federação LRSJ
  'ativo',
  'Criada via auditoria de 91 registros pendentes - 4 atletas mapeados'
)
ON CONFLICT (sigla) DO NOTHING;

-- Inserir: Garra Team (1 atleta)
INSERT INTO public.academias (sigla, nome, federacao_id, status, observacoes)
VALUES (
  'GAR',
  'Garra Team',
  '6e5d037e-0dfd-40d5-a1af-b8b2a334fa7d',  -- Federação LRSJ
  'ativo',
  'Criada via auditoria de 91 registros pendentes - 1 atleta mapeado'
)
ON CONFLICT (sigla) DO NOTHING;

-- Confirmar inserção
SELECT 'Academias criadas com sucesso:' AS status;
SELECT id, sigla, nome, federacao_id, status FROM public.academias 
WHERE sigla IN ('DCM', 'GAR')
ORDER BY sigla;

-- Agora executar resolve_academia_id() para mapear os atletas
-- Isso vai atualizar os campos academia_id dos 5 registros
SELECT 'Re-mapeando atletas após criar academias...' AS status;

-- UPDATE: Mapear Dojo Cáceres Moraes
UPDATE public.user_fed_lrsj ufl
SET academia_id = a.id
FROM public.academias a
WHERE a.sigla = 'DCM'
  AND ufl.academia_id IS NULL
  AND UPPER(TRIM(ufl.academias)) = UPPER('Dojo Cáceres Moraes');

SELECT 'Mapeados para Dojo Cáceres Moraes: ' || CHANGES() || ' registros' AS status;

-- UPDATE: Mapear Garra Team
UPDATE public.user_fed_lrsj ufl
SET academia_id = a.id
FROM public.academias a
WHERE a.sigla = 'GAR'
  AND ufl.academia_id IS NULL
  AND UPPER(TRIM(REPLACE(ufl.academias, '•', ''))) = UPPER('GARRA TEAM');

SELECT 'Mapeados para Garra Team: ' || CHANGES() || ' registros' AS status;

-- Validação final
SELECT 
  'RESULTADO FINAL' AS operacao,
  COUNT(*) AS total_agora,
  COUNT(*) FILTER (WHERE academia_id IS NOT NULL) AS com_academia_id,
  COUNT(*) FILTER (WHERE academia_id IS NULL) AS sem_academia_id,
  ROUND(COUNT(*) FILTER (WHERE academia_id IS NOT NULL) * 100.0 / COUNT(*), 2) as percentual_mapeado
FROM public.user_fed_lrsj;

-- Listar os 5 registros agora mapeados
SELECT 'Atletas mapeados após criação:' AS detalhe;
SELECT 
  ufl.id,
  ufl.numero_membro,
  ufl.nome_completo,
  a.sigla,
  a.nome as nome_academia
FROM public.user_fed_lrsj ufl
LEFT JOIN public.academias a ON a.id = ufl.academia_id
WHERE (UPPER(TRIM(ufl.academias)) = UPPER('Dojo Cáceres Moraes') 
   OR UPPER(TRIM(REPLACE(ufl.academias, '•', ''))) = UPPER('GARRA TEAM'))
ORDER BY a.sigla, ufl.nome_completo;
