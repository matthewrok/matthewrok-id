-- MATTHEW JOKI: only create application profiles after email verification.
-- Supabase Auth still stores a pending auth.users row to deliver/validate the confirmation link.
-- No row is created in public.profiles until email_confirmed_at becomes non-null.

begin;

create or replace function public.handle_verified_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'warga biasa'
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

-- Replace the old immediate profile-creation trigger.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_verified_insert on auth.users;
drop trigger if exists on_auth_user_email_verified on auth.users;

-- Covers projects where email confirmation is disabled (already-confirmed insert).
create trigger on_auth_user_verified_insert
after insert on auth.users
for each row
when (new.email_confirmed_at is not null)
execute function public.handle_verified_user();

-- Covers the normal flow: pending signup becomes confirmed after the user clicks Gmail link.
create trigger on_auth_user_email_verified
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.handle_verified_user();

commit;
