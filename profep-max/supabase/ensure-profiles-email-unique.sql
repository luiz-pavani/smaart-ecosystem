-- Enforce unique email per profile (case-insensitive)
--
-- Recommended workflow:
-- 1) Run the duplicate check query below and resolve any duplicates.
-- 2) Run the index creation.
--
-- Duplicate check (should return 0 rows):
--   select lower(email) as email_lower, count(*)
--   from public.profiles
--   where email is not null and trim(email) <> ''
--   group by lower(email)
--   having count(*) > 1;

do $$
begin
  if exists (
    select 1
    from (
      select lower(email) as email_lower, count(*)
      from public.profiles
      where email is not null and trim(email) <> ''
      group by lower(email)
      having count(*) > 1
    ) d
  ) then
    raise exception 'Cannot enforce unique email: duplicates exist in public.profiles. Run the duplicate check query in supabase/ensure-profiles-email-unique.sql and resolve duplicates first.';
  end if;
end $$;

-- Case-insensitive uniqueness via functional unique index
create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email))
  where email is not null and trim(email) <> '';
