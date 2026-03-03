-- ============================================================
-- Ajustes: ícones 6º/7º/8º dan + regra de novo lote por validade
-- Data: 2026-03-03
-- ============================================================

-- 1) Garantir quadradinhos vermelho/branco para 6º, 7º e 8º dan
UPDATE public.kyu_dan
SET icones = '🟥⬜',
    updated_at = now()
WHERE lower(btrim(kyu_dan)) IN ('6º dan', '7º dan', '8º dan')
  AND COALESCE(icones, '') <> '🟥⬜';

-- 2) Reforçar regra de lote:
--    Sempre que data_expiracao for alterada para mais no futuro,
--    um novo lote deve ser atribuído.
CREATE OR REPLACE FUNCTION public.fn_assign_lote_user_fed_lrsj()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_new_filiacao boolean := false;
  is_renovacao_status boolean := false;
  is_renovacao_data_adesao boolean := false;
  is_renovacao_validade_futura boolean := false;
  is_manual_override boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    is_new_filiacao := COALESCE(btrim(NEW.lote_id), '') = '';

    IF is_new_filiacao THEN
      NEW.lote_id := public.fn_next_lote_label();
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Detecta override manual explícito do lote
    is_manual_override :=
      NEW.lote_id IS DISTINCT FROM OLD.lote_id
      AND COALESCE(btrim(NEW.lote_id), '') <> '';

    -- Renovação por status
    is_renovacao_status :=
      COALESCE(lower(OLD.status_plano), '') <> COALESCE(lower(NEW.status_plano), '')
      AND COALESCE(lower(NEW.status_plano), '') IN ('válido', 'valido', 'active');

    -- Renovação por data de adesão
    is_renovacao_data_adesao :=
      NEW.data_adesao IS DISTINCT FROM OLD.data_adesao
      AND NEW.data_adesao IS NOT NULL;

    -- Regra prioritária: validade movida para o futuro => sempre novo lote
    is_renovacao_validade_futura :=
      NEW.data_expiracao IS DISTINCT FROM OLD.data_expiracao
      AND NEW.data_expiracao IS NOT NULL
      AND (
        OLD.data_expiracao IS NULL
        OR NEW.data_expiracao > OLD.data_expiracao
      );

    IF is_renovacao_validade_futura THEN
      NEW.lote_id := public.fn_next_lote_label();
      RETURN NEW;
    END IF;

    -- Demais cenários continuam respeitando override manual
    IF (is_renovacao_status OR is_renovacao_data_adesao) AND NOT is_manual_override THEN
      NEW.lote_id := public.fn_next_lote_label();
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
