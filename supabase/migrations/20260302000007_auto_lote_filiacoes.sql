-- ============================================================
-- Automação de lote para novas filiações e renovações
-- Tabela alvo: public.user_fed_lrsj
-- Formato: [ano] [#] (ex.: 2026 2)
-- ============================================================

-- 1) Controle transacional do último número de lote por ano
CREATE TABLE IF NOT EXISTS public.lote_sequence_control (
  ano_referencia integer PRIMARY KEY,
  ultimo_numero integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Compatibilidade com versão antiga da tabela (id/ultimo_lote)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lote_sequence_control'
      AND column_name = 'id'
  ) THEN
    DROP TABLE public.lote_sequence_control;

    CREATE TABLE public.lote_sequence_control (
      ano_referencia integer PRIMARY KEY,
      ultimo_numero integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Inicializa contadores por ano a partir dos lotes já existentes no formato "YYYY N"
WITH lote_parse AS (
  SELECT
    (regexp_match(btrim(lote_id), '^(\d{4})\s+(\d+)$'))[1]::int AS ano_ref,
    (regexp_match(btrim(lote_id), '^(\d{4})\s+(\d+)$'))[2]::int AS numero
  FROM public.user_fed_lrsj
  WHERE lote_id ~ '^\d{4}\s+\d+$'
), max_por_ano AS (
  SELECT ano_ref, MAX(numero) AS max_num
  FROM lote_parse
  GROUP BY ano_ref
)
INSERT INTO public.lote_sequence_control (ano_referencia, ultimo_numero)
SELECT ano_ref, max_num
FROM max_por_ano
ON CONFLICT (ano_referencia)
DO UPDATE SET
  ultimo_numero = GREATEST(public.lote_sequence_control.ultimo_numero, EXCLUDED.ultimo_numero),
  updated_at = now();

-- Regra solicitada: para 2026 iniciar em "2026 2" (próximo número = 2)
INSERT INTO public.lote_sequence_control (ano_referencia, ultimo_numero)
VALUES (2026, 1)
ON CONFLICT (ano_referencia)
DO UPDATE SET
  ultimo_numero = GREATEST(public.lote_sequence_control.ultimo_numero, 1),
  updated_at = now();

-- 2) Função que gera próximo lote de forma segura (sem corrida)
CREATE OR REPLACE FUNCTION public.fn_next_lote_label()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  ano_atual integer := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  next_numero integer;
BEGIN
  INSERT INTO public.lote_sequence_control (ano_referencia, ultimo_numero)
  VALUES (ano_atual, CASE WHEN ano_atual = 2026 THEN 1 ELSE 0 END)
  ON CONFLICT (ano_referencia) DO NOTHING;

  UPDATE public.lote_sequence_control
  SET ultimo_numero = ultimo_numero + 1,
      updated_at = now()
  WHERE ano_referencia = ano_atual
  RETURNING ultimo_numero INTO next_numero;

  RETURN format('%s %s', ano_atual, next_numero);
END;
$$;

-- 3) Trigger para atribuição automática + manual override
CREATE OR REPLACE FUNCTION public.fn_assign_lote_user_fed_lrsj()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_new_filiacao boolean := false;
  is_renovacao boolean := false;
  is_manual_override boolean := false;
BEGIN
  -- Nova filiação: INSERT sem lote informado (manual override permitido)
  IF TG_OP = 'INSERT' THEN
    is_new_filiacao := COALESCE(btrim(NEW.lote_id), '') = '';

    IF is_new_filiacao THEN
      NEW.lote_id := public.fn_next_lote_label();
    END IF;

    RETURN NEW;
  END IF;

  -- Renovação: critérios de negócio para UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Manual override: se lote_id vier explicitamente alterado para valor não vazio, respeita
    is_manual_override :=
      NEW.lote_id IS DISTINCT FROM OLD.lote_id
      AND COALESCE(btrim(NEW.lote_id), '') <> '';

    is_renovacao :=
      (
        COALESCE(lower(OLD.status_plano), '') <> COALESCE(lower(NEW.status_plano), '')
        AND COALESCE(lower(NEW.status_plano), '') IN ('válido', 'valido', 'active')
      )
      OR (
        NEW.data_expiracao IS DISTINCT FROM OLD.data_expiracao
        AND NEW.data_expiracao IS NOT NULL
        AND (
          OLD.data_expiracao IS NULL
          OR NEW.data_expiracao > OLD.data_expiracao
        )
      )
      OR (
        NEW.data_adesao IS DISTINCT FROM OLD.data_adesao
        AND NEW.data_adesao IS NOT NULL
      );

    IF is_renovacao AND NOT is_manual_override THEN
      NEW.lote_id := public.fn_next_lote_label();
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_lote_user_fed_lrsj ON public.user_fed_lrsj;

CREATE TRIGGER trg_assign_lote_user_fed_lrsj
BEFORE INSERT OR UPDATE OF status_plano, data_expiracao, data_adesao, lote_id
ON public.user_fed_lrsj
FOR EACH ROW
EXECUTE FUNCTION public.fn_assign_lote_user_fed_lrsj();
