-- Log centralizado de erros app (em vez de Sentry pago).
-- Endpoint /api/_log envia exceções não-capturadas e erros server-side.
-- Read restrito a event_admin via RLS. TTL 30d via função purge.

create table if not exists public.app_error_log (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  severity text not null default 'error',
  source text not null,
  user_id uuid,
  evento_id uuid,
  url text,
  user_agent text,
  message text not null,
  stack text,
  context jsonb,
  constraint chk_app_error_severity check (severity = any (array['fatal','error','warn','info']))
);

create index if not exists idx_app_error_log_recent on public.app_error_log(occurred_at desc);
create index if not exists idx_app_error_log_severity on public.app_error_log(severity, occurred_at desc);
create index if not exists idx_app_error_log_evento on public.app_error_log(evento_id, occurred_at desc) where evento_id is not null;

alter table public.app_error_log enable row level security;

drop policy if exists app_error_log_admin_read on public.app_error_log;
create policy app_error_log_admin_read on public.app_error_log
  for select to authenticated using (public.is_event_admin(auth.uid()));

create or replace function public.app_error_log_purge_old()
returns void
language sql
security definer
set search_path to public, pg_temp
as $$
  delete from public.app_error_log where occurred_at < now() - interval '30 days';
$$;

revoke execute on function public.app_error_log_purge_old() from anon, public, authenticated;
