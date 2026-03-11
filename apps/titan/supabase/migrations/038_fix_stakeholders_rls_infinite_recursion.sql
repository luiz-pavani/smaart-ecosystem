-- ================================================================
-- MIGRATION 038: FIX INFINITE RECURSION IN STAKEHOLDERS RLS
-- ================================================================
-- Problem: "stakeholders select admin" and "stakeholders update role"
-- policies both query FROM stakeholders to check the caller's role,
-- which triggers the same policies → 42P17 infinite recursion.
--
-- Fix: SECURITY DEFINER helper functions bypass RLS when called,
-- so they can safely query stakeholders without recursing.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. SECURITY DEFINER helpers (bypass RLS, no recursion)
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.my_stakeholder_role()
  RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT role FROM public.stakeholders WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.my_stakeholder_federacao_id()
  RETURNS UUID
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT federacao_id FROM public.stakeholders WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.my_stakeholder_academia_id()
  RETURNS UUID
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT academia_id FROM public.stakeholders WHERE id = auth.uid()
$$;

-- ----------------------------------------------------------------
-- 2. REBUILD SELECT POLICY (no self-referencing subquery)
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "stakeholders select admin" ON public.stakeholders;

CREATE POLICY "stakeholders select admin"
  ON public.stakeholders FOR SELECT
  USING (
    -- always see your own row
    id = auth.uid()
    -- master_access sees everyone
    OR my_stakeholder_role() = 'master_access'
    -- federacao_admin/gestor sees everyone in their federation
    OR (
      my_stakeholder_role() IN ('federacao_admin', 'federacao_gestor')
      AND federacao_id = my_stakeholder_federacao_id()
      AND federacao_id IS NOT NULL
    )
    -- academia_admin/gestor/professor sees everyone in their academy
    OR (
      my_stakeholder_role() IN ('academia_admin', 'academia_gestor', 'professor')
      AND academia_id = my_stakeholder_academia_id()
      AND academia_id IS NOT NULL
    )
  );

-- ----------------------------------------------------------------
-- 3. REBUILD UPDATE POLICY (no self-referencing subquery)
-- ----------------------------------------------------------------

DROP POLICY IF EXISTS "stakeholders update role" ON public.stakeholders;

CREATE POLICY "stakeholders update role"
  ON public.stakeholders FOR UPDATE
  USING (
    -- can always update yourself
    id = auth.uid()
    -- admins can update rows with lower hierarchy level
    OR EXISTS (
      SELECT 1
      FROM public.roles admin_r
      JOIN public.roles target_r ON target_r.role = stakeholders.role
      WHERE admin_r.role = my_stakeholder_role()
        AND admin_r.nivel_hierarquico < target_r.nivel_hierarquico
        AND (
          my_stakeholder_role() = 'master_access'
          OR (my_stakeholder_federacao_id() = stakeholders.federacao_id AND stakeholders.federacao_id IS NOT NULL)
          OR (my_stakeholder_academia_id() = stakeholders.academia_id AND stakeholders.academia_id IS NOT NULL)
        )
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR my_stakeholder_role() IN ('master_access', 'federacao_admin', 'academia_admin')
  );
