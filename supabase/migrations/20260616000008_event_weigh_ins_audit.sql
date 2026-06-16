-- Audit log de alterações de pesagem (quem pesou/repesou/alterou status, quando).

create table if not exists public.event_weigh_ins_audit (
  id bigserial primary key,
  weigh_in_id uuid,
  evento_id uuid not null,
  atleta_id uuid,
  action text not null,
  peso_anterior numeric(5,2),
  peso_novo numeric(5,2),
  status_anterior text,
  status_novo text,
  changed_by uuid references public.stakeholders(id) on delete set null,
  changed_at timestamptz not null default now(),
  observacao text
);

create index if not exists idx_weigh_ins_audit_event on public.event_weigh_ins_audit(evento_id, changed_at desc);
create index if not exists idx_weigh_ins_audit_atleta on public.event_weigh_ins_audit(atleta_id, changed_at desc);

alter table public.event_weigh_ins_audit enable row level security;

drop policy if exists weigh_ins_audit_select on public.event_weigh_ins_audit;
create policy weigh_ins_audit_select on public.event_weigh_ins_audit
  for select to authenticated using (public.is_event_admin(auth.uid()));

drop policy if exists weigh_ins_audit_insert on public.event_weigh_ins_audit;
create policy weigh_ins_audit_insert on public.event_weigh_ins_audit
  for insert to authenticated with check (public.is_event_admin(auth.uid()));
