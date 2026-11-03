-- Admin-only member role promotion and role-change audit for MATTHEW JOKI.
-- Safe to rerun in Supabase SQL Editor.

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['member'::text, 'admin'::text, 'SULTAN'::text, 'MATTHEW'::text, 'PELANGGAN'::text]));

create table if not exists public.profile_role_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid not null,
  old_role text not null,
  new_role text not null check (new_role in ('SULTAN', 'MATTHEW', 'PELANGGAN')),
  changed_at timestamptz not null default now()
);

alter table public.profile_role_audit enable row level security;
revoke all on table public.profile_role_audit from anon, authenticated;
grant select on table public.profile_role_audit to authenticated;
drop policy if exists "Admins can view role audit" on public.profile_role_audit;
create policy "Admins can view role audit"
  on public.profile_role_audit for select to authenticated
  using ((select public.is_admin()));

create or replace function public.admin_set_member_role(p_user_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_old_role text;
begin
  if (select auth.uid()) is null then
    raise exception 'Login diperlukan.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Hanya admin yang boleh mengubah role.';
  end if;

  if p_new_role not in ('SULTAN', 'MATTHEW', 'PELANGGAN') then
    raise exception 'Role tidak valid.';
  end if;

  if p_user_id = (select auth.uid()) then
    raise exception 'Role akun admin yang sedang digunakan tidak dapat diubah melalui fitur ini.';
  end if;

  select role into v_old_role
  from public.profiles
  where id = p_user_id
  for update;

  if not found or v_old_role = 'admin' then
    raise exception 'Akun tidak ditemukan atau merupakan admin.';
  end if;

  update public.profiles set role = p_new_role where id = p_user_id;

  insert into public.profile_role_audit(actor_user_id, target_user_id, old_role, new_role)
  values ((select auth.uid()), p_user_id, coalesce(v_old_role, 'member'), p_new_role);
end;
$function$;

revoke all on function public.admin_set_member_role(uuid, text) from public;
revoke all on function public.admin_set_member_role(uuid, text) from anon;
grant execute on function public.admin_set_member_role(uuid, text) to authenticated;
