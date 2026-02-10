-- Migration: Fix vendas table RLS for admin dashboard
-- Date: 2026-02-03
-- Issue: Admin dashboard cannot read vendas table (0 records returned)
-- Solution: Disable RLS completely on vendas table

-- Make sure RLS is fully disabled
ALTER TABLE public.vendas DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be blocking
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.vendas;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.vendas;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.vendas;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.vendas;
DROP POLICY IF EXISTS "vendas_anon_insert" ON public.vendas;
DROP POLICY IF EXISTS "vendas_anon_read" ON public.vendas;
DROP POLICY IF EXISTS "public_read" ON public.vendas;
DROP POLICY IF EXISTS "authenticated_all" ON public.vendas;
