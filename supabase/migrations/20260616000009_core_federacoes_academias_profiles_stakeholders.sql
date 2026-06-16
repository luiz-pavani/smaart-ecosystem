-- core: federacoes + academias + profiles + stakeholders
-- versiona tabelas criadas manualmente no remoto. idempotente.
-- ordem de dependencia: federacoes -> academias -> profiles -> stakeholders
-- (stakeholders fecha o ciclo com FKs para federacoes e academias)

-- ============================================================
-- helper functions
-- ============================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.my_stakeholder_role()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select role from public.stakeholders where id = auth.uid()
$$;

create or replace function public.my_stakeholder_federacao_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select federacao_id from public.stakeholders where id = auth.uid()
$$;

create or replace function public.my_stakeholder_academia_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select academia_id from public.stakeholders where id = auth.uid()
$$;

create or replace function public.sync_domain_tables_from_stakeholder()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  has_user_fed_nome boolean := false;
  has_user_fed_email boolean := false;
begin
  if to_regclass('public.federacoes') is not null then
    update public.federacoes f
    set
      nome = coalesce(nullif(new.nome_completo, ''), f.nome),
      email = coalesce(nullif(new.email, ''), f.email)
    where f.stakeholder_id = new.id;
  end if;

  if to_regclass('public.academias') is not null then
    update public.academias a
    set
      responsavel_nome = coalesce(nullif(new.nome_completo, ''), a.responsavel_nome),
      responsavel_email = coalesce(nullif(new.email, ''), a.responsavel_email)
    where a.stakeholder_id = new.id;
  end if;

  if to_regclass('public.user_fed_lrsj') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_fed_lrsj'
        and column_name = 'nome_completo'
    ) into has_user_fed_nome;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_fed_lrsj'
        and column_name = 'email'
    ) into has_user_fed_email;

    if has_user_fed_nome and has_user_fed_email then
      execute '
        update public.user_fed_lrsj u
        set
          nome_completo = coalesce(nullif($1, ''''), u.nome_completo),
          email = coalesce(nullif($2, ''''), u.email)
        where u.stakeholder_id = $3
      '
      using new.nome_completo, new.email, new.id;
    elsif has_user_fed_nome then
      execute '
        update public.user_fed_lrsj u
        set nome_completo = coalesce(nullif($1, ''''), u.nome_completo)
        where u.stakeholder_id = $2
      '
      using new.nome_completo, new.id;
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- federacoes
-- stakeholder_id is NOT NULL on remote, but stakeholders table is
-- created later in this script. we create federacoes without the
-- FK / NOT NULL first and then patch it after stakeholders exists.
-- ============================================================

create table if not exists public.federacoes (
  id uuid primary key default uuid_generate_v4(),
  nome varchar(255) not null,
  sigla varchar(10) not null,
  cnpj varchar(18),
  endereco_rua varchar(255),
  endereco_numero varchar(20),
  endereco_complemento varchar(100),
  endereco_bairro varchar(100),
  endereco_cidade varchar(100),
  endereco_estado varchar(2),
  endereco_cep varchar(9),
  telefone varchar(20),
  email varchar(255),
  site varchar(255),
  safe2pay_token text,
  safe2pay_signature_key text,
  safe2pay_sandbox boolean default true,
  cor_primaria varchar(7) default '#16A34A',
  cor_secundaria varchar(7) default '#DC2626',
  logo_url text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  valor_anualidade_2026 numeric(10,2) default 690.00,
  max_parcelas_anualidade integer default 10,
  stakeholder_id uuid,
  constraint federacoes_sigla_key unique (sigla),
  constraint federacoes_cnpj_key unique (cnpj)
);

create index if not exists idx_federacoes_stakeholder_id
  on public.federacoes(stakeholder_id)
  where stakeholder_id is not null;

alter table public.federacoes enable row level security;

drop policy if exists federacoes_anon_select on public.federacoes;
create policy federacoes_anon_select on public.federacoes
  for select to anon, authenticated using (true);

drop trigger if exists federacoes_updated_at on public.federacoes;
create trigger federacoes_updated_at
  before update on public.federacoes
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- academias
-- ============================================================

create table if not exists public.academias (
  id uuid primary key default uuid_generate_v4(),
  federacao_id uuid not null references public.federacoes(id) on delete cascade,
  nome varchar(255) not null,
  nome_fantasia varchar(255),
  cnpj varchar(18),
  inscricao_estadual varchar(20),
  inscricao_municipal varchar(20),
  endereco_rua varchar(255),
  endereco_numero varchar(20),
  endereco_complemento varchar(100),
  endereco_bairro varchar(100),
  endereco_cidade varchar(100),
  endereco_estado varchar(2),
  endereco_cep varchar(9),
  responsavel_nome varchar(255) not null,
  responsavel_cpf varchar(14) not null,
  responsavel_rg varchar(20),
  responsavel_telefone varchar(20),
  responsavel_email varchar(255) not null,
  responsavel_faixa varchar(50),
  tecnico_nome varchar(255),
  tecnico_cpf varchar(14),
  tecnico_registro_profissional varchar(50),
  tecnico_telefone varchar(20),
  tecnico_email varchar(255),
  data_filiacao date default current_date,
  horario_funcionamento text,
  quantidade_alunos integer default 0,
  anualidade_status varchar(20) default 'pendente',
  anualidade_vencimento date,
  safe2pay_subscription_id varchar(100),
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sigla varchar(3),
  logo_url text,
  certificado_2026_id uuid,
  endereco_pais varchar(100),
  plan_status varchar(50),
  plan_expire_date date,
  order_date timestamp,
  payment_method varchar(50),
  payment_reference text,
  pais varchar(100) default 'Brasil',
  stakeholder_id uuid,
  safe2pay_plan_id integer,
  safe2pay_api_key text,
  safe2pay_api_secret text,
  safe2pay_webhook_url text,
  pagamento_habilitado boolean not null default false
);

create index if not exists idx_academias_federacao on public.academias(federacao_id);
create index if not exists idx_academias_responsavel_email on public.academias(responsavel_email);
create index if not exists idx_academias_anualidade on public.academias(anualidade_status, anualidade_vencimento);
create index if not exists idx_academias_certificado on public.academias(certificado_2026_id);
create index if not exists idx_academias_stakeholder_id
  on public.academias(stakeholder_id)
  where stakeholder_id is not null;

alter table public.academias enable row level security;

drop policy if exists academias_authenticated_select on public.academias;
create policy academias_authenticated_select on public.academias
  for select to authenticated using (true);

drop trigger if exists academias_updated_at on public.academias;
create trigger academias_updated_at
  before update on public.academias
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- profiles (FK -> auth.users)
-- ============================================================

create table if not exists public.profiles (
  id uuid not null primary key references auth.users(id) on delete cascade,
  role text not null default 'atleta',
  full_name text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint profiles_role_check check (role = any (array['atleta'::text, 'organizador'::text, 'admin'::text]))
);

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- ============================================================
-- stakeholders
-- depende de federacoes + academias + auth.users
-- + tambem referencia roles(role) e kyu_dan(id) — FKs adicionadas
--   condicionalmente caso essas tabelas existam no destino.
-- ============================================================

create table if not exists public.stakeholders (
  id uuid not null primary key references auth.users(id) on delete cascade,
  funcao varchar(20) not null,
  nome_completo varchar(255) not null,
  email varchar(255),
  nome_usuario varchar(50) not null,
  senha text,
  role text not null default 'atleta',
  federacao_id uuid references public.federacoes(id) on delete set null,
  academia_id uuid references public.academias(id) on delete set null,
  telefone text,
  data_nascimento date,
  genero text,
  kyu_dan_id integer,
  instagram text,
  candidato boolean default false,
  safe2pay_subscription_id text,
  peso_atual numeric(5,1),
  terms_accepted_at timestamptz,
  terms_version text,
  smoothcomp_member_no text,
  constraint stakeholders_funcao_check check (
    (funcao)::text = any ((array['FEDERACAO'::varchar, 'ACADEMIA'::varchar, 'ATLETA'::varchar])::text[])
  )
);

-- FKs condicionais para tabelas que vivem em outros arquivos
do $$
begin
  if to_regclass('public.roles') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'stakeholders_role_fkey' and conrelid = 'public.stakeholders'::regclass
     ) then
    alter table public.stakeholders
      add constraint stakeholders_role_fkey foreign key (role) references public.roles(role);
  end if;

  if to_regclass('public.kyu_dan') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'stakeholders_kyu_dan_id_fkey' and conrelid = 'public.stakeholders'::regclass
     ) then
    alter table public.stakeholders
      add constraint stakeholders_kyu_dan_id_fkey foreign key (kyu_dan_id) references public.kyu_dan(id);
  end if;
end $$;

create unique index if not exists idx_stakeholders_nome_usuario_unique
  on public.stakeholders (lower((nome_usuario)::text));
create index if not exists idx_stakeholders_role on public.stakeholders(role);
create index if not exists idx_stakeholders_federacao on public.stakeholders(federacao_id);
create index if not exists idx_stakeholders_academia on public.stakeholders(academia_id);
create unique index if not exists idx_stakeholders_telefone
  on public.stakeholders(telefone) where telefone is not null;
create unique index if not exists uq_stakeholders_smoothcomp_member_no
  on public.stakeholders(smoothcomp_member_no) where smoothcomp_member_no is not null;

alter table public.stakeholders enable row level security;

drop policy if exists "stakeholders insert own" on public.stakeholders;
create policy "stakeholders insert own" on public.stakeholders
  for insert with check (id = auth.uid());

drop policy if exists "stakeholders select own" on public.stakeholders;
create policy "stakeholders select own" on public.stakeholders
  for select using (id = auth.uid());

drop policy if exists "stakeholders select admin" on public.stakeholders;
create policy "stakeholders select admin" on public.stakeholders
  for select using (
    (id = auth.uid())
    or (public.my_stakeholder_role() = 'master_access')
    or (
      public.my_stakeholder_role() = any (array['federacao_admin','federacao_gestor'])
      and federacao_id = public.my_stakeholder_federacao_id()
      and federacao_id is not null
    )
    or (
      public.my_stakeholder_role() = any (array['academia_admin','academia_gestor','professor'])
      and academia_id = public.my_stakeholder_academia_id()
      and academia_id is not null
    )
  );

drop policy if exists "stakeholders update own" on public.stakeholders;
create policy "stakeholders update own" on public.stakeholders
  for update using (id = auth.uid()) with check (id = auth.uid());

-- a policy "stakeholders update role" depende de public.roles(nivel_hierarquico);
-- so cria se a tabela existir no destino.
do $$
begin
  if to_regclass('public.roles') is not null then
    execute 'drop policy if exists "stakeholders update role" on public.stakeholders';
    execute $pol$
      create policy "stakeholders update role" on public.stakeholders
        for update
        using (
          (id = auth.uid())
          or exists (
            select 1
            from public.roles admin_r
            join public.roles target_r on target_r.role = stakeholders.role
            where admin_r.role = public.my_stakeholder_role()
              and admin_r.nivel_hierarquico < target_r.nivel_hierarquico
              and (
                public.my_stakeholder_role() = 'master_access'
                or (public.my_stakeholder_federacao_id() = stakeholders.federacao_id and stakeholders.federacao_id is not null)
                or (public.my_stakeholder_academia_id() = stakeholders.academia_id and stakeholders.academia_id is not null)
              )
          )
        )
        with check (
          (id = auth.uid())
          or public.my_stakeholder_role() = any (array['master_access','federacao_admin','academia_admin'])
        )
    $pol$;
  end if;
end $$;

drop trigger if exists trg_sync_domain_from_stakeholder on public.stakeholders;
create trigger trg_sync_domain_from_stakeholder
  after update of nome_completo, email on public.stakeholders
  for each row execute function public.sync_domain_tables_from_stakeholder();

-- ============================================================
-- patch: stakeholder_id obrigatorio em federacoes / academias
-- aplicado depois de stakeholders existir (idempotente via NOT EXISTS).
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'federacoes_stakeholder_id_fkey' and conrelid = 'public.federacoes'::regclass
  ) then
    alter table public.federacoes
      add constraint federacoes_stakeholder_id_fkey
      foreign key (stakeholder_id) references public.stakeholders(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ck_federacoes_stakeholder_required' and conrelid = 'public.federacoes'::regclass
  ) then
    alter table public.federacoes
      add constraint ck_federacoes_stakeholder_required check (stakeholder_id is not null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'academias_stakeholder_id_fkey' and conrelid = 'public.academias'::regclass
  ) then
    alter table public.academias
      add constraint academias_stakeholder_id_fkey
      foreign key (stakeholder_id) references public.stakeholders(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ck_academias_stakeholder_required' and conrelid = 'public.academias'::regclass
  ) then
    alter table public.academias
      add constraint ck_academias_stakeholder_required check (stakeholder_id is not null);
  end if;
end $$;
