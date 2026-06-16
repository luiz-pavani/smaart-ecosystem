-- Fase 2: categorias + inscrições + pesagem + waivers
-- Versiona tabelas criadas manualmente no remoto. Idempotente.

-- ============================================================
-- event_age_groups
-- ============================================================
create table if not exists public.event_age_groups (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  idade_min integer not null,
  idade_max integer,
  modalidade text default 'Judo',
  tempo_luta_seg integer not null default 240,
  golden_score_seg integer,
  ordem integer not null default 0,
  created_at timestamptz default now(),
  intervalo_entre_lutas_seg integer default 60
);

alter table public.event_age_groups enable row level security;

drop policy if exists age_groups_select on public.event_age_groups;
create policy age_groups_select on public.event_age_groups for select using (true);
drop policy if exists age_groups_insert on public.event_age_groups;
create policy age_groups_insert on public.event_age_groups for insert with check (public.is_event_admin(auth.uid()));
drop policy if exists age_groups_update on public.event_age_groups;
create policy age_groups_update on public.event_age_groups for update using (public.is_event_admin(auth.uid()));
drop policy if exists age_groups_delete on public.event_age_groups;
create policy age_groups_delete on public.event_age_groups for delete using (public.is_event_admin(auth.uid()));

-- ============================================================
-- event_weight_classes
-- ============================================================
create table if not exists public.event_weight_classes (
  id uuid primary key default gen_random_uuid(),
  age_group_id uuid not null references public.event_age_groups(id) on delete cascade,
  genero text not null,
  nome text not null,
  peso_min numeric,
  peso_max numeric,
  ordem integer not null default 0,
  created_at timestamptz default now(),
  constraint event_weight_classes_genero_check check (genero = any (array['Masculino','Feminino']))
);

create index if not exists idx_weight_classes_age_group on public.event_weight_classes(age_group_id);

alter table public.event_weight_classes enable row level security;

drop policy if exists weight_classes_select on public.event_weight_classes;
create policy weight_classes_select on public.event_weight_classes for select using (true);
drop policy if exists weight_classes_insert on public.event_weight_classes;
create policy weight_classes_insert on public.event_weight_classes for insert with check (public.is_event_admin(auth.uid()));
drop policy if exists weight_classes_update on public.event_weight_classes;
create policy weight_classes_update on public.event_weight_classes for update using (public.is_event_admin(auth.uid()));
drop policy if exists weight_classes_delete on public.event_weight_classes;
create policy weight_classes_delete on public.event_weight_classes for delete using (public.is_event_admin(auth.uid()));

-- ============================================================
-- event_categories
-- ============================================================
create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  age_group_id uuid references public.event_age_groups(id),
  weight_class_id uuid references public.event_weight_classes(id),
  genero text not null,
  kyu_dan_min integer,
  kyu_dan_max integer,
  nome_display text not null,
  taxa_inscricao numeric not null default 0,
  limite_inscritos integer,
  tempo_luta_seg integer not null default 240,
  golden_score_seg integer,
  ativo boolean default true,
  created_at timestamptz default now(),
  intervalo_entre_lutas_seg integer,
  modo text not null default 'competitivo',
  dia_competicao date,
  constraint event_categories_genero_check check (genero = any (array['Masculino','Feminino'])),
  constraint event_categories_modo_check check (modo = any (array['competitivo','festival']))
);

create index if not exists idx_event_categories_ativo on public.event_categories(evento_id, ativo) where ativo = true;
create index if not exists idx_event_categories_dia_competicao on public.event_categories(evento_id, dia_competicao);
create index if not exists idx_event_categories_evento on public.event_categories(evento_id);

alter table public.event_categories enable row level security;

drop policy if exists categories_select on public.event_categories;
create policy categories_select on public.event_categories for select using (true);
drop policy if exists categories_insert on public.event_categories;
create policy categories_insert on public.event_categories for insert with check (public.is_event_admin(auth.uid()));
drop policy if exists categories_update on public.event_categories;
create policy categories_update on public.event_categories for update using (public.is_event_admin(auth.uid()));
drop policy if exists categories_delete on public.event_categories;
create policy categories_delete on public.event_categories for delete using (public.is_event_admin(auth.uid()));

-- ============================================================
-- event_registrations
-- ============================================================
create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.eventos(id) on delete cascade,
  atleta_id uuid references auth.users(id) on delete set null,
  status text default 'pending',
  registration_date date default current_date,
  created_at timestamptz default now(),
  valor_pago numeric,
  updated_at timestamptz default now(),
  category_id uuid references public.event_categories(id),
  peso_inscricao numeric,
  academia_id uuid references public.academias(id),
  dados_atleta jsonb default '{}'::jsonb,
  constraint event_registrations_status_valid check (status = any (array['pending_payment','pending_waivers','confirmed','cancelled','no_show'])),
  constraint uq_event_registration_atleta unique (event_id, atleta_id)
);

create index if not exists idx_event_reg_atleta on public.event_registrations(atleta_id);
create index if not exists idx_event_reg_category on public.event_registrations(category_id);
create index if not exists idx_event_reg_event on public.event_registrations(event_id);

drop trigger if exists trg_event_registrations_updated_at on public.event_registrations;
create trigger trg_event_registrations_updated_at
  before update on public.event_registrations
  for each row execute function public.set_updated_at();

alter table public.event_registrations enable row level security;

drop policy if exists registrations_select on public.event_registrations;
create policy registrations_select on public.event_registrations for select using ((atleta_id = auth.uid()) or public.is_event_admin(auth.uid()));
drop policy if exists registrations_insert on public.event_registrations;
create policy registrations_insert on public.event_registrations for insert with check ((atleta_id = auth.uid()) or public.is_event_admin(auth.uid()));
drop policy if exists registrations_update on public.event_registrations;
create policy registrations_update on public.event_registrations for update using ((atleta_id = auth.uid()) or public.is_event_admin(auth.uid()));
drop policy if exists registrations_delete on public.event_registrations;
create policy registrations_delete on public.event_registrations for delete using ((atleta_id = auth.uid()) or public.is_event_admin(auth.uid()));

-- ============================================================
-- event_weigh_ins
-- ============================================================
create table if not exists public.event_weigh_ins (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  registration_id uuid not null references public.event_registrations(id) on delete cascade,
  category_id uuid references public.event_categories(id) on delete set null,
  peso_oficial numeric not null,
  peso_min numeric,
  peso_max numeric,
  dentro_limite boolean not null default false,
  status text not null default 'pendente',
  observacao text,
  pesado_por uuid references auth.users(id) on delete set null,
  pesado_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_weigh_ins_registration_id_key unique (registration_id),
  constraint event_weigh_ins_status_check check (status = any (array['pendente','aprovado','rejeitado']))
);

create index if not exists idx_event_weigh_ins_evento on public.event_weigh_ins(evento_id);
create index if not exists idx_event_weigh_ins_status on public.event_weigh_ins(evento_id, status);

alter table public.event_weigh_ins enable row level security;

drop policy if exists weigh_ins_select_all_authenticated on public.event_weigh_ins;
create policy weigh_ins_select_all_authenticated on public.event_weigh_ins
  for select to authenticated using (true);

drop policy if exists weigh_ins_admin_write on public.event_weigh_ins;
create policy weigh_ins_admin_write on public.event_weigh_ins
  for all to authenticated
  using (exists (select 1 from public.stakeholders s where s.id = auth.uid() and s.role = any (array['master_access','federacao_admin','federacao_gestor'])))
  with check (exists (select 1 from public.stakeholders s where s.id = auth.uid() and s.role = any (array['master_access','federacao_admin','federacao_gestor'])));

-- ============================================================
-- event_waivers
-- ============================================================
create table if not exists public.event_waivers (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  titulo text not null,
  conteudo text not null,
  obrigatorio boolean default true,
  ordem integer default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_event_waivers_evento on public.event_waivers(evento_id);

alter table public.event_waivers enable row level security;

drop policy if exists waivers_read on public.event_waivers;
create policy waivers_read on public.event_waivers for select to authenticated using (true);
drop policy if exists waivers_write on public.event_waivers;
create policy waivers_write on public.event_waivers for all to authenticated using (true) with check (true);

-- ============================================================
-- event_waiver_signatures
-- ============================================================
create table if not exists public.event_waiver_signatures (
  id uuid primary key default gen_random_uuid(),
  waiver_id uuid not null references public.event_waivers(id) on delete cascade,
  registration_id uuid not null references public.event_registrations(id) on delete cascade,
  atleta_id uuid not null,
  assinado_em timestamptz default now(),
  ip_address text,
  user_agent text,
  signer_name text,
  signer_cpf text,
  signer_relationship text,
  signer_type text not null default 'atleta',
  constraint event_waiver_signatures_waiver_id_registration_id_key unique (waiver_id, registration_id),
  constraint event_waiver_signatures_signer_type_valid check (signer_type = any (array['atleta','responsavel','professor'])),
  constraint event_waiver_signatures_signer_data_complete check (
    (signer_type = 'atleta')
    or ((signer_name is not null) and (length(trim(both from signer_name)) > 0)
        and (signer_cpf is not null) and (length(trim(both from signer_cpf)) > 0)
        and (signer_relationship is not null) and (length(trim(both from signer_relationship)) > 0))
  )
);

create index if not exists idx_waiver_signatures_reg on public.event_waiver_signatures(registration_id);

alter table public.event_waiver_signatures enable row level security;

drop policy if exists waiver_sigs_read on public.event_waiver_signatures;
create policy waiver_sigs_read on public.event_waiver_signatures for select to authenticated using (true);
drop policy if exists waiver_sigs_write on public.event_waiver_signatures;
create policy waiver_sigs_write on public.event_waiver_signatures for all to authenticated using (true) with check (true);
