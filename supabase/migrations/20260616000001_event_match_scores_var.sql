-- event_match_scores + event_match_var
-- Versiona tabelas criadas manualmente no remoto. Idempotente.

create or replace function public.is_event_admin(user_uid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.stakeholders
    where id = user_uid
      and role in ('master_access', 'federacao_admin', 'federacao_gestor')
  );
$$;

create table if not exists public.event_match_scores (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.event_matches(id) on delete cascade,
  modalidade_id text not null default 'judo' references public.scoring_modalities(id),
  pontos_athlete1 jsonb default '{"shido": 0, "wazaari": 0}'::jsonb,
  pontos_athlete2 jsonb default '{"shido": 0, "wazaari": 0}'::jsonb,
  osaekomi_athlete integer,
  osaekomi_seconds integer default 0,
  golden_score boolean default false,
  clock_seconds integer not null default 240,
  clock_running boolean default false,
  status text not null default 'waiting',
  updated_at timestamptz default now(),
  constraint event_match_scores_match_id_key unique (match_id),
  constraint chk_osaekomi_athlete check (osaekomi_athlete is null or osaekomi_athlete = any (array[1, 2])),
  constraint chk_score_status check (status = any (array['waiting','running','paused','golden_score','finished']))
);

create table if not exists public.event_match_var (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.event_matches(id) on delete cascade,
  solicitado_por text default 'operador',
  motivo text,
  timestamp_luta_seg integer,
  video_url text,
  decisao text default 'pendente',
  observacao text,
  created_at timestamptz default now(),
  constraint chk_var_decisao check (decisao = any (array['pendente','mantida','revertida']))
);

create index if not exists idx_event_match_var_match_id on public.event_match_var(match_id);
create index if not exists idx_event_match_var_pendente on public.event_match_var(match_id) where decisao = 'pendente';

alter table public.event_match_scores enable row level security;
alter table public.event_match_var enable row level security;

drop policy if exists match_scores_select on public.event_match_scores;
create policy match_scores_select on public.event_match_scores
  for select using (true);

drop policy if exists match_scores_insert_admin on public.event_match_scores;
create policy match_scores_insert_admin on public.event_match_scores
  for insert with check (public.is_event_admin(auth.uid()));

drop policy if exists match_scores_update_admin on public.event_match_scores;
create policy match_scores_update_admin on public.event_match_scores
  for update using (public.is_event_admin(auth.uid()));

drop policy if exists match_scores_delete_admin on public.event_match_scores;
create policy match_scores_delete_admin on public.event_match_scores
  for delete using (public.is_event_admin(auth.uid()));

drop policy if exists match_var_select on public.event_match_var;
create policy match_var_select on public.event_match_var
  for select using (true);

drop policy if exists match_var_insert_admin on public.event_match_var;
create policy match_var_insert_admin on public.event_match_var
  for insert with check (public.is_event_admin(auth.uid()));

drop policy if exists match_var_update_admin on public.event_match_var;
create policy match_var_update_admin on public.event_match_var
  for update using (public.is_event_admin(auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='event_match_scores'
  ) then
    execute 'alter publication supabase_realtime add table public.event_match_scores';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='event_match_var'
  ) then
    execute 'alter publication supabase_realtime add table public.event_match_var';
  end if;
end $$;
