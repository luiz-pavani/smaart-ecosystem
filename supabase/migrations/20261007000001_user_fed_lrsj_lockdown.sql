-- Fecha o vazamento de PII via public.user_fed_lrsj (2026-10-07).
--
-- A view pertence a postgres e não tem security_invoker → ignora o RLS de stakeholders.
-- anon/authenticated tinham ALL na view; o trigger INSTEAD OF UPDATE (user_fed_lrsj_update_redirect)
-- é SECURITY DEFINER, então anon também conseguia ALTERAR filiações/dados pessoais via PATCH.
-- Toda escrita legítima na view passa por supabaseAdmin (service_role) nas rotas /api.
--
-- stakeholder_filiacoes tinha policy SELECT using(true) para public → anon lia a tabela-base
-- direto (url_documento_id, observacoes, …). Só rotas /api com supabaseAdmin leem essa tabela.

begin;

-- 1) View: sem acesso anon; authenticated só lê (o portal usa o client do navegador para SELECT).
revoke all on public.user_fed_lrsj from anon;
revoke insert, update, delete, truncate, references, trigger on public.user_fed_lrsj from authenticated;

-- 2) stakeholder_filiacoes: troca SELECT público por próprio / admin de federação / staff da academia.
drop policy if exists filiacoes_select on public.stakeholder_filiacoes;
create policy filiacoes_select on public.stakeholder_filiacoes
  for select to authenticated
  using (
    stakeholder_id = auth.uid()
    or is_event_admin(auth.uid())
    or (
      my_stakeholder_role() = any (array['academia_admin','academia_gestor','professor'])
      and academia_id is not null
      and academia_id = my_stakeholder_academia_id()
    )
  );
revoke insert, update, delete, truncate, references, trigger on public.stakeholder_filiacoes from anon;

-- 3) Verificação pública da carteira (QR code): só campos não sensíveis, um stakeholder_id por vez.
create or replace function public.carteira_publica(p_stakeholder_id uuid)
returns table (
  stakeholder_id uuid,
  nome_completo text,
  nome_patch text,
  status_membro text,
  status_plano text,
  data_expiracao text,
  kyu_dan_id bigint,
  url_foto text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select v.stakeholder_id, v.nome_completo::text, v.nome_patch, v.status_membro, v.status_plano,
         v.data_expiracao, v.kyu_dan_id, v.url_foto
  from public.user_fed_lrsj v
  where v.stakeholder_id = p_stakeholder_id
  limit 1
$$;

revoke all on function public.carteira_publica(uuid) from public;
grant execute on function public.carteira_publica(uuid) to anon, authenticated;

commit;
