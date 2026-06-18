-- Alinha CHECK de profiles.role com a tabela canônica public.roles.
-- O CHECK original só aceitava atleta/organizador/admin, mas a trigger
-- handle_new_user copia raw_user_meta_data->>'role' direto pra profiles —
-- o que quebrava qualquer signup com role={professor,academia_admin,…}.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array[
    'atleta','professor','academia_admin','academia_gestor',
    'federacao_admin','federacao_gestor','master_access',
    'organizador','admin'  -- legacy
  ]));
