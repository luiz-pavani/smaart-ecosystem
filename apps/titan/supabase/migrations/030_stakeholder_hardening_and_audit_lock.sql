-- Migration 030: Hardening final do vínculo com stakeholders
-- Objetivo:
-- 1) Garantir trilha de auditoria do fallback aplicado em user_fed_lrsj
-- 2) Aplicar lock final (NOT NULL) em stakeholder_id nas tabelas de domínio
-- 3) Validar cobertura e integridade referencial antes do lock

-- ================================================================
-- 1) Garantir tabela de log de override (rastreabilidade)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_fed_lrsj_stakeholder_override_log (
  user_fed_lrsj_id BIGINT PRIMARY KEY,
  stakeholder_id_aplicado UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE RESTRICT,
  motivo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_fed_override_log_stakeholder_id
  ON public.user_fed_lrsj_stakeholder_override_log (stakeholder_id_aplicado);

CREATE INDEX IF NOT EXISTS idx_user_fed_override_log_created_at
  ON public.user_fed_lrsj_stakeholder_override_log (created_at);

-- ================================================================
-- 2) Hardening condicionado por validação de gaps + FK
-- ================================================================
DO $$
DECLARE
  federacoes_gap BIGINT := 0;
  academias_gap BIGINT := 0;
  user_fed_gap BIGINT := 0;

  federacoes_fk_invalid BIGINT := 0;
  academias_fk_invalid BIGINT := 0;
  user_fed_fk_invalid BIGINT := 0;
BEGIN
  IF to_regclass('public.federacoes') IS NULL
    OR to_regclass('public.academias') IS NULL
    OR to_regclass('public.user_fed_lrsj') IS NULL
    OR to_regclass('public.stakeholders') IS NULL THEN
    RAISE EXCEPTION 'Tabelas obrigatórias ausentes para migration 030.';
  END IF;

  SELECT COUNT(*) INTO federacoes_gap FROM public.federacoes WHERE stakeholder_id IS NULL;
  SELECT COUNT(*) INTO academias_gap FROM public.academias WHERE stakeholder_id IS NULL;
  SELECT COUNT(*) INTO user_fed_gap FROM public.user_fed_lrsj WHERE stakeholder_id IS NULL;

  SELECT COUNT(*) INTO federacoes_fk_invalid
  FROM public.federacoes f
  LEFT JOIN public.stakeholders s ON s.id = f.stakeholder_id
  WHERE f.stakeholder_id IS NOT NULL AND s.id IS NULL;

  SELECT COUNT(*) INTO academias_fk_invalid
  FROM public.academias a
  LEFT JOIN public.stakeholders s ON s.id = a.stakeholder_id
  WHERE a.stakeholder_id IS NOT NULL AND s.id IS NULL;

  SELECT COUNT(*) INTO user_fed_fk_invalid
  FROM public.user_fed_lrsj u
  LEFT JOIN public.stakeholders s ON s.id = u.stakeholder_id
  WHERE u.stakeholder_id IS NOT NULL AND s.id IS NULL;

  IF federacoes_gap > 0 OR academias_gap > 0 OR user_fed_gap > 0 THEN
    RAISE EXCEPTION 'Não é possível aplicar NOT NULL. Gaps -> federacoes:%, academias:%, user_fed_lrsj:%',
      federacoes_gap, academias_gap, user_fed_gap;
  END IF;

  IF federacoes_fk_invalid > 0 OR academias_fk_invalid > 0 OR user_fed_fk_invalid > 0 THEN
    RAISE EXCEPTION 'Não é possível aplicar NOT NULL. FK inválida -> federacoes:%, academias:%, user_fed_lrsj:%',
      federacoes_fk_invalid, academias_fk_invalid, user_fed_fk_invalid;
  END IF;

  ALTER TABLE public.federacoes ALTER COLUMN stakeholder_id SET NOT NULL;
  ALTER TABLE public.academias ALTER COLUMN stakeholder_id SET NOT NULL;
  ALTER TABLE public.user_fed_lrsj ALTER COLUMN stakeholder_id SET NOT NULL;

  RAISE NOTICE '[030] Hardening aplicado: stakeholder_id NOT NULL em federacoes, academias e user_fed_lrsj.';
END;
$$;

-- ================================================================
-- 3) Auditoria pós-lock
-- ================================================================
DO $$
DECLARE
  federacoes_total BIGINT := 0;
  academias_total BIGINT := 0;
  user_fed_total BIGINT := 0;

  federacoes_gap BIGINT := 0;
  academias_gap BIGINT := 0;
  user_fed_gap BIGINT := 0;

  overrides_total BIGINT := 0;
BEGIN
  SELECT COUNT(*) INTO federacoes_total FROM public.federacoes;
  SELECT COUNT(*) INTO academias_total FROM public.academias;
  SELECT COUNT(*) INTO user_fed_total FROM public.user_fed_lrsj;

  SELECT COUNT(*) INTO federacoes_gap FROM public.federacoes WHERE stakeholder_id IS NULL;
  SELECT COUNT(*) INTO academias_gap FROM public.academias WHERE stakeholder_id IS NULL;
  SELECT COUNT(*) INTO user_fed_gap FROM public.user_fed_lrsj WHERE stakeholder_id IS NULL;

  SELECT COUNT(*) INTO overrides_total FROM public.user_fed_lrsj_stakeholder_override_log;

  RAISE NOTICE '[030] federacoes total=%, sem_stakeholder_id=%', federacoes_total, federacoes_gap;
  RAISE NOTICE '[030] academias total=%, sem_stakeholder_id=%', academias_total, academias_gap;
  RAISE NOTICE '[030] user_fed_lrsj total=%, sem_stakeholder_id=%', user_fed_total, user_fed_gap;
  RAISE NOTICE '[030] user_fed_lrsj_stakeholder_override_log total=%', overrides_total;
END;
$$;
