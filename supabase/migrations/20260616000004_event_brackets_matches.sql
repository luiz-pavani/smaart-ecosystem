-- Fase 3: brackets + matches + audit log + results + ranking points
-- Versiona tabelas criadas manualmente no remoto. Idempotente.

-- ============================================================
-- event_brackets
-- ============================================================
create table if not exists public.event_brackets (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  category_id uuid not null references public.event_categories(id) on delete cascade,
  tipo text not null default 'single_elimination_repechage',
  status text not null default 'draft',
  num_rodadas integer,
  area_id integer default 1,
  ordem_no_dia integer,
  hora_estimada time,
  seed_method text default 'random',
  config jsonb default '{"academy_separation": true}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uq_bracket_category unique (category_id),
  constraint chk_bracket_status check (status = any (array['draft','published','in_progress','finished'])),
  constraint chk_bracket_tipo check (tipo = any (array['single_elimination','single_elimination_bronze','single_elimination_repechage','double_elimination','round_robin','group_stage_elimination','best_of_3']))
);

create index if not exists idx_brackets_category on public.event_brackets(category_id);
create index if not exists idx_brackets_evento on public.event_brackets(evento_id);
create index if not exists idx_brackets_status on public.event_brackets(status);

drop trigger if exists trg_brackets_updated_at on public.event_brackets;
create trigger trg_brackets_updated_at
  before update on public.event_brackets
  for each row execute function public.set_updated_at();

alter table public.event_brackets enable row level security;

drop policy if exists brackets_select_all on public.event_brackets;
create policy brackets_select_all on public.event_brackets for select to authenticated using (true);
drop policy if exists brackets_insert_admin on public.event_brackets;
create policy brackets_insert_admin on public.event_brackets for insert to authenticated with check (public.is_event_admin(auth.uid()));
drop policy if exists brackets_update_admin on public.event_brackets;
create policy brackets_update_admin on public.event_brackets for update to authenticated using (public.is_event_admin(auth.uid()));
drop policy if exists brackets_delete_admin on public.event_brackets;
create policy brackets_delete_admin on public.event_brackets for delete to authenticated using (public.is_event_admin(auth.uid()));

-- ============================================================
-- event_bracket_slots
-- ============================================================
create table if not exists public.event_bracket_slots (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references public.event_brackets(id) on delete cascade,
  rodada integer not null,
  posicao integer not null,
  registration_id uuid references public.event_registrations(id) on delete set null,
  is_bye boolean default false,
  seed_number integer,
  constraint uq_bracket_slot_pos unique (bracket_id, rodada, posicao)
);

create index if not exists idx_bracket_slots_bracket on public.event_bracket_slots(bracket_id);
create index if not exists idx_bracket_slots_registration on public.event_bracket_slots(registration_id);

alter table public.event_bracket_slots enable row level security;

drop policy if exists bracket_slots_select_all on public.event_bracket_slots;
create policy bracket_slots_select_all on public.event_bracket_slots for select to authenticated using (true);
drop policy if exists bracket_slots_insert_admin on public.event_bracket_slots;
create policy bracket_slots_insert_admin on public.event_bracket_slots for insert to authenticated
  with check (exists (select 1 from public.event_brackets eb where eb.id = event_bracket_slots.bracket_id) and public.is_event_admin(auth.uid()));
drop policy if exists bracket_slots_update_admin on public.event_bracket_slots;
create policy bracket_slots_update_admin on public.event_bracket_slots for update to authenticated using (public.is_event_admin(auth.uid()));
drop policy if exists bracket_slots_delete_admin on public.event_bracket_slots;
create policy bracket_slots_delete_admin on public.event_bracket_slots for delete to authenticated using (public.is_event_admin(auth.uid()));

-- ============================================================
-- event_matches
-- ============================================================
create table if not exists public.event_matches (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references public.event_brackets(id) on delete cascade,
  rodada integer not null,
  posicao integer not null,
  match_number integer,
  athlete1_registration_id uuid references public.event_registrations(id) on delete set null,
  athlete2_registration_id uuid references public.event_registrations(id) on delete set null,
  winner_registration_id uuid references public.event_registrations(id) on delete set null,
  resultado text,
  resultado_detalhe text,
  pontos_athlete1 jsonb default '{"shido": 0, "wazaari": 0}'::jsonb,
  pontos_athlete2 jsonb default '{"shido": 0, "wazaari": 0}'::jsonb,
  duracao_segundos integer,
  tipo text not null default 'main',
  area_id integer,
  hora_estimada time,
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  confirmed_by uuid references public.stakeholders(id) on delete set null,
  confirmed_at timestamptz,
  finished_by uuid references public.stakeholders(id) on delete set null,
  constraint chk_match_resultado check (resultado is null or resultado = any (array['ippon','waza-ari','golden_score','hansoku-make','fusen-gachi','kiken-gachi','sogo-gachi'])),
  constraint chk_match_status check (status = any (array['pending','ready','in_progress','finished','walkover'])),
  constraint chk_match_tipo check (tipo = any (array['main','repechage','bronze','semifinal','final','losers','group','grand_final']))
);

create index if not exists idx_matches_athlete1 on public.event_matches(athlete1_registration_id);
create index if not exists idx_matches_athlete2 on public.event_matches(athlete2_registration_id);
create index if not exists idx_matches_bracket on public.event_matches(bracket_id);
create index if not exists idx_matches_status on public.event_matches(status);
create index if not exists idx_matches_winner on public.event_matches(winner_registration_id);

drop trigger if exists trg_matches_updated_at on public.event_matches;
create trigger trg_matches_updated_at
  before update on public.event_matches
  for each row execute function public.set_updated_at();

alter table public.event_matches enable row level security;

drop policy if exists matches_select_all on public.event_matches;
create policy matches_select_all on public.event_matches for select to authenticated using (true);
drop policy if exists matches_insert_admin on public.event_matches;
create policy matches_insert_admin on public.event_matches for insert to authenticated
  with check (exists (select 1 from public.event_brackets eb where eb.id = event_matches.bracket_id) and public.is_event_admin(auth.uid()));
drop policy if exists matches_update_admin on public.event_matches;
create policy matches_update_admin on public.event_matches for update to authenticated using (public.is_event_admin(auth.uid()));
drop policy if exists matches_delete_admin on public.event_matches;
create policy matches_delete_admin on public.event_matches for delete to authenticated using (public.is_event_admin(auth.uid()));

-- realtime
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='event_matches') then
    execute 'alter publication supabase_realtime add table public.event_matches';
  end if;
end $$;

-- ============================================================
-- event_match_audit_log
-- ============================================================
create sequence if not exists public.event_match_audit_log_id_seq;

create table if not exists public.event_match_audit_log (
  id bigint primary key default nextval('public.event_match_audit_log_id_seq'::regclass),
  match_id uuid not null references public.event_matches(id) on delete cascade,
  user_id uuid references public.stakeholders(id) on delete set null,
  action text not null,
  delta jsonb,
  clock_seconds integer,
  golden_score boolean,
  created_at timestamptz not null default now()
);

alter sequence public.event_match_audit_log_id_seq owned by public.event_match_audit_log.id;

create index if not exists idx_event_match_audit_log_match_time on public.event_match_audit_log(match_id, created_at);

alter table public.event_match_audit_log enable row level security;

drop policy if exists "Admin pode ler audit log" on public.event_match_audit_log;
create policy "Admin pode ler audit log" on public.event_match_audit_log
  for select using (auth.uid() in (
    select stakeholders.id from public.stakeholders
    where stakeholders.role = any (array['master_access','federacao_admin','federacao_gestor'])
  ));

-- ============================================================
-- event_results
-- ============================================================
create table if not exists public.event_results (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  categoria text not null,
  colocacao integer not null,
  atleta_nome text not null,
  observacoes text,
  created_at timestamptz default now(),
  bracket_id uuid references public.event_brackets(id) on delete set null,
  registration_id uuid references public.event_registrations(id) on delete set null,
  category_id uuid references public.event_categories(id) on delete set null,
  medal text,
  atleta_id uuid,
  academia_id uuid,
  academia_nome text,
  constraint chk_result_medal check (medal is null or medal = any (array['gold','silver','bronze']))
);

create index if not exists idx_results_bracket on public.event_results(bracket_id);
create index if not exists idx_results_category on public.event_results(category_id);
create index if not exists idx_results_evento on public.event_results(evento_id);
create index if not exists idx_results_medal on public.event_results(medal);

alter table public.event_results enable row level security;

drop policy if exists results_select on public.event_results;
create policy results_select on public.event_results for select using (true);
drop policy if exists results_insert on public.event_results;
create policy results_insert on public.event_results for insert with check (public.is_event_admin(auth.uid()));
drop policy if exists results_update on public.event_results;
create policy results_update on public.event_results for update using (public.is_event_admin(auth.uid()));
drop policy if exists results_delete on public.event_results;
create policy results_delete on public.event_results for delete using (public.is_event_admin(auth.uid()));

-- ============================================================
-- event_ranking_points
-- ============================================================
create table if not exists public.event_ranking_points (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  result_id uuid references public.event_results(id) on delete cascade,
  registration_id uuid references public.event_registrations(id),
  atleta_id uuid,
  categoria text,
  category_id uuid references public.event_categories(id),
  colocacao integer not null,
  pontos integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_ranking_points_atleta on public.event_ranking_points(atleta_id);
create index if not exists idx_ranking_points_evento on public.event_ranking_points(evento_id);

alter table public.event_ranking_points enable row level security;

drop policy if exists ranking_points_read on public.event_ranking_points;
create policy ranking_points_read on public.event_ranking_points for select to authenticated using (true);
drop policy if exists ranking_points_write on public.event_ranking_points;
create policy ranking_points_write on public.event_ranking_points for all to authenticated using (true) with check (true);
