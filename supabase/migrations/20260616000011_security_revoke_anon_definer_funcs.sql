-- Revoga EXECUTE de anon e PUBLIC para funções SECURITY DEFINER sensíveis.
-- Resolve advisors do Supabase database-linter (0028 + 0029).
-- Mantém execute por 'authenticated' onde faz sentido (RPC pelo cliente logado).

revoke execute on function public.get_my_nivel() from anon, public;
revoke execute on function public.get_my_role() from anon, public;
revoke execute on function public.is_event_admin(uuid) from anon, public;
revoke execute on function public.my_stakeholder_academia_id() from anon, public;
revoke execute on function public.my_stakeholder_federacao_id() from anon, public;
revoke execute on function public.my_stakeholder_role() from anon, public;

-- Triggers internas / privilégio admin — não devem ser RPC-callable:
revoke execute on function public.handle_new_user() from anon, public, authenticated;
revoke execute on function public.upsert_stakeholder_from_auth_user() from anon, public, authenticated;
revoke execute on function public.increment_webhook_attempts(bigint, text) from anon, public, authenticated;
revoke execute on function public.pode_atribuir_permissao(uuid, text, uuid, uuid) from anon, public, authenticated;
