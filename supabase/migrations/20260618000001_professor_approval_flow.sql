-- Fluxo de cadastro de professor com aprovação.
-- 2 vias: (A) escolhe academia existente → pendente_academia
--         (B) cria nova academia → pendente_federacao
-- Sentinel 'aprovado' como default mantém atletas/professores legados intactos.

alter table public.stakeholders
  add column if not exists pending_role text,
  add column if not exists approval_status text not null default 'aprovado',
  add column if not exists approval_requested_at timestamptz,
  add column if not exists approved_by uuid references public.stakeholders(id) on delete set null,
  add column if not exists approved_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_stake_approval_status') then
    alter table public.stakeholders
      add constraint chk_stake_approval_status
      check (approval_status = any (array['aprovado','pendente_academia','pendente_federacao','rejeitado']));
  end if;
end $$;

create index if not exists idx_stakeholders_approval_pending
  on public.stakeholders(approval_status) where approval_status <> 'aprovado';

alter table public.academias
  add column if not exists approval_status text not null default 'aprovado',
  add column if not exists created_by_stakeholder uuid references public.stakeholders(id) on delete set null,
  add column if not exists approval_requested_at timestamptz,
  add column if not exists approved_by uuid references public.stakeholders(id) on delete set null,
  add column if not exists approved_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_acad_approval_status') then
    alter table public.academias
      add constraint chk_acad_approval_status
      check (approval_status = any (array['aprovado','pendente_federacao','rejeitado']));
  end if;
end $$;

create index if not exists idx_academias_approval_pending
  on public.academias(approval_status) where approval_status <> 'aprovado';
