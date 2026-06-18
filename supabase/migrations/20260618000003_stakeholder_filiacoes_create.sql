-- FASE 1 do refactor B: criar tabela genérica de filiações federativas.
-- Substituirá user_fed_lrsj (específica da LRSJ — não escalava p/ outras federações).
-- Modelo: 1 stakeholder → N filiações (1 por federação ativa).

create table if not exists public.stakeholder_filiacoes (
  id uuid primary key default gen_random_uuid(),
  stakeholder_id uuid not null references public.stakeholders(id) on delete cascade,
  federacao_id uuid not null references public.federacoes(id) on delete restrict,
  academia_id uuid references public.academias(id) on delete set null,

  -- Plano + estado da filiação
  plano_tipo text,
  status_membro text default 'ativo',
  status_plano text,
  data_adesao date,
  data_expiracao date,
  lote_id text,  -- legado LRSJ é texto livre ("2026 3773"), não UUID

  -- Workflow de validação
  dados_validados boolean not null default false,
  validado_em timestamptz,
  validado_por uuid references public.stakeholders(id) on delete set null,
  observacoes text,

  -- Documentos / mídia
  url_foto text,
  url_documento_id text,
  url_certificado_dan text,

  -- Uniforme / patches (específico da federação)
  nome_patch text,
  tamanho_patch text,
  cor_patch text,
  siglas text,

  -- Graduação na federação
  kyu_dan_id integer,
  data_ultima_graduacao date,
  nivel_arbitragem text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_stakeholder_federacao unique (stakeholder_id, federacao_id),
  constraint chk_status_membro check (status_membro is null or status_membro in
    ('ativo','pendente','suspenso','inativo','expirado','rejeitado','aprovado'))
);

create index if not exists idx_filiacoes_stakeholder on public.stakeholder_filiacoes(stakeholder_id);
create index if not exists idx_filiacoes_federacao on public.stakeholder_filiacoes(federacao_id);
create index if not exists idx_filiacoes_academia on public.stakeholder_filiacoes(academia_id);
create index if not exists idx_filiacoes_status on public.stakeholder_filiacoes(status_membro);

create or replace function public.tg_stakeholder_filiacoes_updated_at()
returns trigger language plpgsql security invoker
set search_path to 'public', 'pg_temp' as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_filiacoes_updated_at on public.stakeholder_filiacoes;
create trigger trg_filiacoes_updated_at
  before update on public.stakeholder_filiacoes
  for each row execute function public.tg_stakeholder_filiacoes_updated_at();

alter table public.stakeholder_filiacoes enable row level security;

drop policy if exists filiacoes_select on public.stakeholder_filiacoes;
create policy filiacoes_select on public.stakeholder_filiacoes
  for select using (true);

drop policy if exists filiacoes_write_admin on public.stakeholder_filiacoes;
create policy filiacoes_write_admin on public.stakeholder_filiacoes
  for all to authenticated
  using (public.is_event_admin(auth.uid()))
  with check (public.is_event_admin(auth.uid()));
