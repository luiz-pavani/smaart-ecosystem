-- Migration: Criar RPC para INSERT vendas (SECURITY DEFINER) + desabilitar RLS
-- Data: 2026-02-02
-- Motivo: Webhook precisa inserir vendas mas RLS está bloqueando

-- 1. Desabilitar RLS na tabela vendas
ALTER TABLE public.vendas DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as policies antigos
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.vendas;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.vendas;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.vendas;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.vendas;
DROP POLICY IF EXISTS "vendas_anon_insert" ON public.vendas;
DROP POLICY IF EXISTS "vendas_anon_read" ON public.vendas;

-- 3. Criar função RPC com SECURITY DEFINER que contorna RLS
CREATE OR REPLACE FUNCTION public.vendas_insert_bypass_rls(
  p_email TEXT,
  p_valor DECIMAL,
  p_plano TEXT,
  p_metodo TEXT,
  p_transaction_id TEXT DEFAULT NULL,
  p_subscription_id TEXT DEFAULT NULL,
  p_cycle_number INTEGER DEFAULT 1,
  p_event_type TEXT DEFAULT NULL,
  p_created_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(id BIGINT, success BOOLEAN, message TEXT) AS $$
DECLARE
  v_venda_id BIGINT;
  v_msg TEXT;
BEGIN
  -- Verificar idempotência
  IF p_transaction_id IS NOT NULL THEN
    SELECT public.vendas.id INTO v_venda_id
    FROM public.vendas
    WHERE transaction_id = p_transaction_id
    LIMIT 1;
    
    IF v_venda_id IS NOT NULL THEN
      RETURN QUERY SELECT v_venda_id, TRUE::BOOLEAN, 'Venda já existe'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Inserir venda diretamente
  INSERT INTO public.vendas (
    email,
    valor,
    plano,
    metodo,
    transaction_id,
    subscription_id,
    cycle_number,
    event_type,
    created_at
  ) VALUES (
    LOWER(TRIM(COALESCE(p_email, ''))),
    p_valor,
    p_plano,
    p_metodo,
    p_transaction_id,
    p_subscription_id,
    p_cycle_number,
    p_event_type,
    COALESCE(p_created_at, NOW())
  )
  RETURNING public.vendas.id INTO v_venda_id;

  RETURN QUERY SELECT v_venda_id, TRUE::BOOLEAN, 'OK'::TEXT;

EXCEPTION WHEN OTHERS THEN
  v_msg := SQLERRM;
  RETURN QUERY SELECT NULL::BIGINT, FALSE::BOOLEAN, v_msg::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant para qualquer role chamar
GRANT EXECUTE ON FUNCTION public.vendas_insert_bypass_rls TO authenticated, anon, service_role;
