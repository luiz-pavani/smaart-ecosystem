-- ================================================================
-- MIGRATION 020: BACKFILL STAKEHOLDER LINKS
-- ================================================================
-- Objetivo:
-- - Popular stakeholders para usuários auth legados
-- - Vincular stakeholder_id em federacoes, academias e atletas
-- - Estratégia segura: papéis (user_roles) > email único
-- - Idempotente: só atualiza quando stakeholder_id está NULL

-- ================================================================
-- 1) Garantir registro de stakeholders para usuários existentes
-- ================================================================
INSERT INTO stakeholders (id, funcao, nome_completo, email, nome_usuario, senha)
SELECT
  au.id,
  normalize_stakeholder_funcao(au.raw_user_meta_data->>'stakeholder_role') AS funcao,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    NULLIF(au.raw_user_meta_data->>'name', ''),
    COALESCE(NULLIF(au.email, ''), 'Usuário')
  ) AS nome_completo,
  NULLIF(au.email, '') AS email,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'username', ''),
    'user_' || SUBSTRING(REPLACE(au.id::TEXT, '-', '') FROM 1 FOR 12)
  ) AS nome_usuario,
  NULL AS senha
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM stakeholders s WHERE s.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 2) FEDERAÇÕES: vincular por user_roles de federação (prioritário)
-- ================================================================
WITH federacao_owner AS (
  SELECT
    ur.federacao_id,
    ur.user_id,
    ROW_NUMBER() OVER (
      PARTITION BY ur.federacao_id
      ORDER BY ur.created_at ASC, ur.user_id ASC
    ) AS rn
  FROM user_roles ur
  WHERE ur.federacao_id IS NOT NULL
    AND ur.role IN ('federacao_admin', 'federacao_secretario', 'master_access')
)
UPDATE federacoes f
SET stakeholder_id = fo.user_id
FROM federacao_owner fo
WHERE f.id = fo.federacao_id
  AND fo.rn = 1
  AND f.stakeholder_id IS NULL
  AND EXISTS (SELECT 1 FROM stakeholders s WHERE s.id = fo.user_id);

-- Fallback por email único da federação
WITH stakeholders_email_unique AS (
  SELECT LOWER(email) AS email_norm, MIN(id::text)::uuid AS stakeholder_id
  FROM stakeholders
  WHERE email IS NOT NULL AND email <> ''
  GROUP BY LOWER(email)
  HAVING COUNT(*) = 1
)
UPDATE federacoes f
SET stakeholder_id = seu.stakeholder_id
FROM stakeholders_email_unique seu
WHERE f.stakeholder_id IS NULL
  AND f.email IS NOT NULL
  AND LOWER(f.email) = seu.email_norm;

-- ================================================================
-- 3) ACADEMIAS: vincular por user_roles de academia (prioritário)
-- ================================================================
WITH academia_owner AS (
  SELECT
    ur.academia_id,
    ur.user_id,
    ROW_NUMBER() OVER (
      PARTITION BY ur.academia_id
      ORDER BY ur.created_at ASC, ur.user_id ASC
    ) AS rn
  FROM user_roles ur
  WHERE ur.academia_id IS NOT NULL
    AND ur.role IN ('academia_admin', 'academia_staff', 'professor', 'master_access')
)
UPDATE academias a
SET stakeholder_id = ao.user_id
FROM academia_owner ao
WHERE a.id = ao.academia_id
  AND ao.rn = 1
  AND a.stakeholder_id IS NULL
  AND EXISTS (SELECT 1 FROM stakeholders s WHERE s.id = ao.user_id);

-- Fallback por email único do responsável
WITH stakeholders_email_unique AS (
  SELECT LOWER(email) AS email_norm, MIN(id::text)::uuid AS stakeholder_id
  FROM stakeholders
  WHERE email IS NOT NULL AND email <> ''
  GROUP BY LOWER(email)
  HAVING COUNT(*) = 1
)
UPDATE academias a
SET stakeholder_id = seu.stakeholder_id
FROM stakeholders_email_unique seu
WHERE a.stakeholder_id IS NULL
  AND a.responsavel_email IS NOT NULL
  AND LOWER(a.responsavel_email) = seu.email_norm;

-- ================================================================
-- 4) ATLETAS: vincular por email único (somente matches 1:1)
-- ================================================================
WITH atletas_email_unique AS (
  SELECT LOWER(email) AS email_norm, MIN(id::text)::uuid AS atleta_id
  FROM atletas
  WHERE email IS NOT NULL AND email <> ''
  GROUP BY LOWER(email)
  HAVING COUNT(*) = 1
),
stakeholders_email_unique AS (
  SELECT LOWER(email) AS email_norm, MIN(id::text)::uuid AS stakeholder_id
  FROM stakeholders
  WHERE email IS NOT NULL AND email <> ''
  GROUP BY LOWER(email)
  HAVING COUNT(*) = 1
)
UPDATE atletas a
SET stakeholder_id = seu.stakeholder_id
FROM atletas_email_unique aeu
JOIN stakeholders_email_unique seu
  ON aeu.email_norm = seu.email_norm
WHERE a.id = aeu.atleta_id
  AND a.stakeholder_id IS NULL;

-- ================================================================
-- 5) Normalizar funcao baseada em vínculos de domínio
-- (apenas quando funcao ainda está inconsistente com vínculo)
-- ================================================================
UPDATE stakeholders s
SET funcao = 'FEDERACAO'
WHERE EXISTS (
  SELECT 1 FROM federacoes f WHERE f.stakeholder_id = s.id
)
  AND s.funcao <> 'FEDERACAO';

UPDATE stakeholders s
SET funcao = 'ACADEMIA'
WHERE s.funcao <> 'FEDERACAO'
  AND EXISTS (
    SELECT 1 FROM academias a WHERE a.stakeholder_id = s.id
  )
  AND s.funcao <> 'ACADEMIA';

UPDATE stakeholders s
SET funcao = 'ATLETA'
WHERE s.funcao NOT IN ('FEDERACAO', 'ACADEMIA')
  AND EXISTS (
    SELECT 1 FROM atletas a WHERE a.stakeholder_id = s.id
  )
  AND s.funcao <> 'ATLETA';
