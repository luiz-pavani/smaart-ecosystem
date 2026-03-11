-- ================================================================
-- MIGRATION 037: ROLE EM STAKEHOLDERS, DROP ATLETAS E USER_ROLES
-- ================================================================
-- Objetivo:
-- 1. Criar tabela 'roles' (lookup) baseada em vw_roles_info
-- 2. Adicionar coluna 'role', 'federacao_id', 'academia_id' em stakeholders
-- 3. Backfill de user_roles → stakeholders
-- 4. Dropar tabelas atletas e user_roles (substituídas por stakeholders)
-- 5. Atualizar/criar view vw_roles_info usando a tabela roles
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TABELA ROLES (lookup)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  role               TEXT PRIMARY KEY,
  nome               TEXT NOT NULL,
  descricao          TEXT,
  nivel_hierarquico  INTEGER NOT NULL,
  acesso_financeiro  BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO public.roles (role, nome, descricao, nivel_hierarquico, acesso_financeiro) VALUES
  ('master_access',   'Master Access',                        'Acesso a absolutamente tudo e todos',                          1, TRUE),
  ('federacao_admin', 'Administrador da Federação',           'Acesso a tudo e todos em sua federação e abaixo',              2, TRUE),
  ('federacao_gestor','Gestor da Federação',                  'Gestão operacional da federação',                              3, FALSE),
  ('academia_admin',  'Responsável Técnico / Presidente',     'Acesso total à academia e seus membros',                       4, TRUE),
  ('academia_gestor', 'Auxiliar Técnico',                     'Gestão operacional da academia',                               5, FALSE),
  ('professor',       'Professor',                            'Acesso às aulas e atletas da academia',                        6, FALSE),
  ('atleta',          'Atleta',                               'Acesso pessoal do atleta',                                     7, FALSE)
ON CONFLICT (role) DO UPDATE SET
  nome              = EXCLUDED.nome,
  descricao         = EXCLUDED.descricao,
  nivel_hierarquico = EXCLUDED.nivel_hierarquico,
  acesso_financeiro = EXCLUDED.acesso_financeiro;

-- Habilitar RLS (leitura pública, sem alterações diretas)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles select all" ON public.roles;
CREATE POLICY "roles select all"
  ON public.roles FOR SELECT
  USING (true);

-- ----------------------------------------------------------------
-- 2. ATUALIZAR vw_roles_info PARA USAR A TABELA roles
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_roles_info AS
SELECT role, nome, descricao, nivel_hierarquico, acesso_financeiro
FROM public.roles
ORDER BY nivel_hierarquico;

-- ----------------------------------------------------------------
-- 3. ADICIONAR COLUNAS EM stakeholders
-- ----------------------------------------------------------------

-- role: vinculado à tabela roles, padrão 'atleta'
ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'atleta'
  REFERENCES public.roles(role);

-- federacao_id: federação à qual o stakeholder pertence
ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS federacao_id UUID REFERENCES public.federacoes(id) ON DELETE SET NULL;

-- academia_id: academia à qual o stakeholder pertence
ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS academia_id UUID REFERENCES public.academias(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_stakeholders_role ON public.stakeholders(role);
CREATE INDEX IF NOT EXISTS idx_stakeholders_federacao ON public.stakeholders(federacao_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_academia ON public.stakeholders(academia_id);

-- ----------------------------------------------------------------
-- 4. BACKFILL: user_roles → stakeholders
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    -- Atualizar role, federacao_id, academia_id baseado em user_roles
    UPDATE public.stakeholders s
    SET
      role         = COALESCE(ur.role, 'atleta'),
      federacao_id = ur.federacao_id,
      academia_id  = ur.academia_id
    FROM public.user_roles ur
    WHERE ur.user_id = s.id
      AND ur.role IS NOT NULL
      AND ur.role IN (SELECT role FROM public.roles);
  END IF;
END;
$$;

-- Backfill restante baseado em funcao (quem não tinha entrada em user_roles)
UPDATE public.stakeholders
SET role = CASE
  WHEN funcao = 'FEDERACAO' THEN 'federacao_admin'
  WHEN funcao = 'ACADEMIA'  THEN 'academia_admin'
  ELSE 'atleta'
END
WHERE role = 'atleta'
  AND funcao IN ('FEDERACAO', 'ACADEMIA');

-- ----------------------------------------------------------------
-- 5. ATUALIZAR RLS de stakeholders PARA ACESSO ADMINISTRATIVO
-- ----------------------------------------------------------------

-- Admins podem ver todos os stakeholders de sua federação/academia
DROP POLICY IF EXISTS "stakeholders select admin" ON public.stakeholders;
CREATE POLICY "stakeholders select admin"
  ON public.stakeholders FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.stakeholders admin_s
      WHERE admin_s.id = auth.uid()
        AND (
          -- master_access vê todos
          admin_s.role = 'master_access'
          -- federacao_admin/gestor vê sua federação
          OR (admin_s.role IN ('federacao_admin', 'federacao_gestor')
              AND admin_s.federacao_id = stakeholders.federacao_id
              AND admin_s.federacao_id IS NOT NULL)
          -- academia_admin/gestor vê sua academia
          OR (admin_s.role IN ('academia_admin', 'academia_gestor', 'professor')
              AND admin_s.academia_id = stakeholders.academia_id
              AND admin_s.academia_id IS NOT NULL)
        )
    )
  );

-- Admins podem atualizar o role de outros (apenas para roles abaixo do próprio nível)
DROP POLICY IF EXISTS "stakeholders update role" ON public.stakeholders;
CREATE POLICY "stakeholders update role"
  ON public.stakeholders FOR UPDATE
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.stakeholders admin_s
      JOIN public.roles admin_r ON admin_r.role = admin_s.role
      JOIN public.roles target_r ON target_r.role = stakeholders.role
      WHERE admin_s.id = auth.uid()
        AND admin_r.nivel_hierarquico < target_r.nivel_hierarquico
        AND (
          admin_s.role = 'master_access'
          OR (admin_s.federacao_id = stakeholders.federacao_id AND admin_s.federacao_id IS NOT NULL)
          OR (admin_s.academia_id = stakeholders.academia_id AND admin_s.academia_id IS NOT NULL)
        )
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.stakeholders admin_s
      WHERE admin_s.id = auth.uid()
        AND admin_s.role IN ('master_access', 'federacao_admin', 'academia_admin')
    )
  );

-- ----------------------------------------------------------------
-- 6. DROPAR TABELA atletas (0 registros em produção; substituída por stakeholders)
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS public.atletas CASCADE;

-- ----------------------------------------------------------------
-- 7. DROPAR TABELA user_roles (substituída por stakeholders.role)
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- ----------------------------------------------------------------
-- 8. FUNÇÃO HELPER: obter role do usuário logado
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.stakeholders WHERE id = auth.uid();
$$;

-- ----------------------------------------------------------------
-- 9. FUNÇÃO HELPER: obter nivel hierárquico do usuário logado
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_nivel()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT r.nivel_hierarquico
  FROM public.stakeholders s
  JOIN public.roles r ON r.role = s.role
  WHERE s.id = auth.uid();
$$;

-- Grant execução das funções helper
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_nivel() TO authenticated;
