-- Auto-activate profile on venda insert
-- Date: 2026-02-03

create or replace function public.activate_profile_from_venda()
returns trigger
language plpgsql
security definer
as $$
declare
  v_auth_id uuid;
  v_plan text;
  v_plan_expires_at timestamptz;
begin
  v_plan := case
    when lower(coalesce(new.plano,'')) like '%mensal%' then 'mensal'
    when lower(coalesce(new.plano,'')) like '%vital%' then 'vitalicio'
    else 'anual'
  end case;

  v_plan_expires_at := case
    when v_plan = 'vitalicio' then null
    when v_plan = 'mensal' then now() + interval '1 month'
    else now() + interval '1 year'
  end case;

  select id into v_auth_id
  from auth.users
  where lower(email) = lower(new.email)
  limit 1;

  if v_auth_id is not null then
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
      v_auth_id,
      lower(new.email),
      null,
      'active',
      v_plan,
      'active',
      v_plan_expires_at,
      'student',
      now(),
      now()
    )
    on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(profiles.full_name, excluded.full_name),
      status = 'active',
      plan = v_plan,
      subscription_status = 'active',
      plan_expires_at = v_plan_expires_at,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_venda_insert_activate_profile on public.vendas;
create trigger on_venda_insert_activate_profile
after insert on public.vendas
for each row execute procedure public.activate_profile_from_venda();
