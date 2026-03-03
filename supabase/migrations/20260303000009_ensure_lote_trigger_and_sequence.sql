-- ============================================================
-- Garantir infraestrutura de lote automático em qualquer ambiente
-- Data: 2026-03-03
-- ============================================================

-- 1) Tabela de controle sequencial por ano
CREATE TABLE IF NOT EXISTS public.lote_sequence_control (
  ano_referencia integer PRIMARY KEY,
  ultimo_numero integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inicializa 2026 para começar em "2026 2" (próximo = 2)
INSERT INTO public.lote_sequence_control (ano_referencia, ultimo_numero)
VALUES (2026, 1)
ON CONFLICT (ano_referencia)
DO UPDATE SET
  ultimo_numero = GREATEST(public.lote_sequence_control.ultimo_numero, 1),
  updated_at = now();

-- 2) Função de próximo lote (segura para concorrência)
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

-- 3) Trigger: aplicar no ciclo de vida de filiação/renovação
DROP TRIGGER IF EXISTS trg_assign_lote_user_fed_lrsj ON public.user_fed_lrsj;

CREATE TRIGGER trg_assign_lote_user_fed_lrsj
BEFORE INSERT OR UPDATE OF status_plano, data_expiracao, data_adesao, lote_id
ON public.user_fed_lrsj
FOR EACH ROW
EXECUTE FUNCTION public.fn_assign_lote_user_fed_lrsj();
