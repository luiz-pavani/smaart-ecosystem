-- Fase 1: base eventos / events (legacy) / scoring_modalities
-- Versiona tabelas criadas manualmente no remoto. Idempotente.

-- helper function (referenciada por triggers em outras migrations e por policies)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

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

-- ============================================================
-- scoring_modalities
-- ============================================================
create table if not exists public.scoring_modalities (
  id text primary key,
  nome text not null,
  config jsonb not null default '{}'::jsonb,
  ativo boolean default true
);

alter table public.scoring_modalities enable row level security;

drop policy if exists scoring_modalities_select on public.scoring_modalities;
create policy scoring_modalities_select on public.scoring_modalities
  for select to authenticated using (true);

-- ============================================================
-- eventos (tabela principal Titan)
-- ============================================================
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_evento date not null,
  local text,
  cidade text,
  descricao text,
  status text default 'Planejamento',
  categoria text,
  limite_inscritos integer,
  taxa_inscricao numeric(10,2),
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  valor_inscricao numeric(10,2) default 0,
  data_evento_fim date,
  hora_inicio time,
  hora_fim time,
  federacao_id uuid references public.federacoes(id),
  modalidade text default 'Judo',
  tipo_evento text default 'Campeonato',
  regulamento text,
  banner_url text,
  inscricao_inicio date,
  inscricao_fim date,
  num_areas integer default 1,
  endereco_completo text,
  contato_email text,
  contato_telefone text,
  publicado boolean default false,
  config jsonb default '{}'::jsonb,
  constraint eventos_status_check check (status = any (array['Planejamento','Inscrições abertas','Inscrições encerradas','Em andamento','Encerrado','Cancelado'])),
  constraint eventos_tipo_evento_check check (tipo_evento = any (array['Campeonato','Torneio','Seminário','Exame de Faixa','Festival','Treino Coletivo','Outro']))
);

create index if not exists idx_eventos_data on public.eventos(data_evento);
create index if not exists idx_eventos_federacao on public.eventos(federacao_id);
create index if not exists idx_eventos_publicado on public.eventos(publicado) where publicado = true;
create index if not exists idx_eventos_status on public.eventos(status);

alter table public.eventos enable row level security;

drop policy if exists eventos_select on public.eventos;
create policy eventos_select on public.eventos
  for select using ((publicado = true) or public.is_event_admin(auth.uid()) or (criado_por = auth.uid()));

drop policy if exists eventos_insert on public.eventos;
create policy eventos_insert on public.eventos
  for insert with check (public.is_event_admin(auth.uid()));

drop policy if exists eventos_update on public.eventos;
create policy eventos_update on public.eventos
  for update using (public.is_event_admin(auth.uid()) or (criado_por = auth.uid()));

drop policy if exists eventos_delete on public.eventos;
create policy eventos_delete on public.eventos
  for delete using (exists (
    select 1 from public.stakeholders
    where stakeholders.id = auth.uid() and stakeholders.role = 'master_access'
  ));

-- ============================================================
-- events (legacy — agenda pública, separada de eventos)
-- ============================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  category text not null,
  location text not null,
  registration_url text not null,
  poster_url text,
  is_featured boolean default false,
  status text not null default 'pending',
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  latitude double precision,
  longitude double precision,
  country_code text,
  constraint events_registration_url_key unique (registration_url),
  constraint events_status_check check (status = any (array['pending','published','rejected']))
);

create index if not exists idx_events_country on public.events(country_code);
create index if not exists idx_events_geo on public.events(latitude, longitude) where (latitude is not null and longitude is not null);

alter table public.events enable row level security;

drop policy if exists "Eventos publicados são visíveis para todos" on public.events;
create policy "Eventos publicados são visíveis para todos" on public.events
  for select using (status = 'published');

drop policy if exists "Organizadores veem seus próprios eventos" on public.events;
create policy "Organizadores veem seus próprios eventos" on public.events
  for select using (auth.uid() = user_id);

drop policy if exists "Organizadores podem inserir eventos" on public.events;
create policy "Organizadores podem inserir eventos" on public.events
  for insert with check ((auth.uid() = user_id) and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'organizador'
  ));

drop policy if exists "Organizadores podem atualizar próprios eventos" on public.events;
create policy "Organizadores podem atualizar próprios eventos" on public.events
  for update using (auth.uid() = user_id);

drop policy if exists "Organizadores podem deletar próprios eventos" on public.events;
create policy "Organizadores podem deletar próprios eventos" on public.events
  for delete using (auth.uid() = user_id);
