-- Ensure profiles are created/updated for every auth user
-- Date: 2026-02-03

-- 1) Create trigger function
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    status,
    plan,
    subscription_status,
    plan_expires_at,
    role,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Usuário'),
    'inactive',
    null,
    null,
    null,
    'student',
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now();

  return new;
end;
$$;

-- 2) Create trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- 3) Backfill: create missing profiles for existing users
insert into public.profiles (
  id,
  email,
  full_name,
  status,
  plan,
  subscription_status,
  plan_expires_at,
  role,
  created_at,
  updated_at
)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Usuário'),
  'inactive',
  null,
  null,
  null,
  'student',
  now(),
  now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
