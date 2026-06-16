-- Credenciamento de evento (check-in da mesa de credenciamento).
-- Token único por inscrição (vai no QR do comprovante).

alter table public.event_registrations
  add column if not exists checked_in boolean not null default false,
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_in_by uuid references public.stakeholders(id) on delete set null,
  add column if not exists checkin_token text unique;

create index if not exists idx_event_registrations_checkin on public.event_registrations(event_id, checked_in);

update public.event_registrations
set checkin_token = substr(replace(encode(gen_random_bytes(12), 'base64'), '/', '_'), 1, 12)
where checkin_token is null;

create or replace function public.set_checkin_token()
returns trigger
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.checkin_token is null then
    new.checkin_token := substr(replace(encode(gen_random_bytes(12), 'base64'), '/', '_'), 1, 12);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_checkin_token on public.event_registrations;
create trigger trg_set_checkin_token
  before insert on public.event_registrations
  for each row execute function public.set_checkin_token();
