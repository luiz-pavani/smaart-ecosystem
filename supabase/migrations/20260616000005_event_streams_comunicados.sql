-- Fase 4: comunicados + streams
-- Versiona tabelas criadas manualmente no remoto. Idempotente.

-- ============================================================
-- event_comunicados
-- ============================================================
create table if not exists public.event_comunicados (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references public.eventos(id) on delete set null,
  titulo text not null,
  mensagem text not null,
  enviado boolean default true,
  created_at timestamptz default now()
);

alter table public.event_comunicados enable row level security;

drop policy if exists comunicados_select on public.event_comunicados;
create policy comunicados_select on public.event_comunicados for select using (true);
drop policy if exists comunicados_insert on public.event_comunicados;
create policy comunicados_insert on public.event_comunicados for insert with check (public.is_event_admin(auth.uid()));
drop policy if exists comunicados_delete on public.event_comunicados;
create policy comunicados_delete on public.event_comunicados for delete using (public.is_event_admin(auth.uid()));

-- ============================================================
-- event_streams
-- ============================================================
create table if not exists public.event_streams (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  area_id integer not null default 1,
  titulo text,
  tipo text not null default 'youtube',
  stream_url text,
  stream_key text,
  status text not null default 'offline',
  viewers_count integer default 0,
  ppv_habilitado boolean default false,
  ppv_valor numeric default 0,
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  youtube_broadcast_id text,
  youtube_stream_id text,
  youtube_lifecycle_status text,
  constraint event_streams_evento_id_area_id_key unique (evento_id, area_id),
  constraint event_streams_status_check check (status = any (array['offline','live','ended'])),
  constraint event_streams_tipo_check check (tipo = any (array['youtube','rtmp_custom','webrtc','iframe']))
);

create index if not exists idx_event_streams_evento on public.event_streams(evento_id);
create index if not exists idx_event_streams_youtube_broadcast on public.event_streams(youtube_broadcast_id) where (youtube_broadcast_id is not null);

alter table public.event_streams enable row level security;

drop policy if exists streams_anon_read on public.event_streams;
create policy streams_anon_read on public.event_streams for select to anon using (true);
drop policy if exists streams_read on public.event_streams;
create policy streams_read on public.event_streams for select to authenticated using (true);
drop policy if exists streams_write on public.event_streams;
create policy streams_write on public.event_streams for all to authenticated using (true) with check (true);
