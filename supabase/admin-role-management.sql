-- Admin-only member role promotion for MATTHEW JOKI.
-- Safe to rerun in Supabase SQL Editor.

-- Izinkan role bawaan serta role promosi yang disediakan dashboard admin.
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['member'::text, 'admin'::text, 'SULTAN'::text, 'MATTHEW'::text, 'PELANGGAN'::text]));

create or replace function public.admin_set_member_role(p_user_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Login diperlukan.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Hanya admin yang boleh mengubah role.';
  end if;

  if p_new_role not in ('SULTAN', 'MATTHEW', 'PELANGGAN') then
    raise exception 'Role tidak valid.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Role akun admin yang sedang digunakan tidak dapat diubah melalui fitur ini.';
  end if;

  update public.profiles
  set role = p_new_role
  where id = p_user_id
    and role <> 'admin';

  if not found then
    raise exception 'Akun tidak ditemukan atau merupakan admin.';
  end if;
end;
$$;

revoke all on function public.admin_set_member_role(uuid, text) from public;
revoke all on function public.admin_set_member_role(uuid, text) from anon;
grant execute on function public.admin_set_member_role(uuid, text) to authenticated;
