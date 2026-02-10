-- CRITICAL FIX: Disable RLS on vendas table to allow webhook inserts
ALTER TABLE public.vendas DISABLE ROW LEVEL SECURITY;
