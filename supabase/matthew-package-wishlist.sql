-- Matthew Wishlist Paket: private, owner-scoped saved products.
create table if not exists public.member_package_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_code text not null check (product_code in ('CH11','CH13','CH17')),
  created_at timestamptz not null default now(),
  constraint member_package_wishlist_user_product_key unique (user_id, product_code)
);
create index if not exists member_package_wishlist_user_created_idx
  on public.member_package_wishlist (user_id, created_at desc);

alter table public.member_package_wishlist enable row level security;
revoke all on public.member_package_wishlist from public, anon, authenticated;

-- Privileged implementation stays in the non-exposed private schema.
create or replace function private.get_my_package_wishlist()
returns table(product_code text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_status text;
begin
  if v_user_id is null then raise exception 'Login diperlukan.'; end if;
  select lower(coalesce(p.role,'')), lower(coalesce(p.account_status,''))
    into v_role, v_status from public.profiles p where p.id=v_user_id;
  if v_status <> 'active' or v_role not in ('warga_biasa','warga_tidak_biasa','warga_sultan') then
    raise exception 'Wishlist hanya tersedia untuk member Warga aktif.';
  end if;
  return query select w.product_code,w.created_at
    from public.member_package_wishlist w
    where w.user_id=v_user_id order by w.created_at desc;
end;
$$;

create or replace function private.add_my_package_to_wishlist(p_product_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_status text;
  v_code text := upper(trim(coalesce(p_product_code,'')));
begin
  if v_user_id is null then raise exception 'Login diperlukan.'; end if;
  if v_code not in ('CH11','CH13','CH17') then raise exception 'Paket tidak valid.'; end if;
  select lower(coalesce(p.role,'')), lower(coalesce(p.account_status,''))
    into v_role, v_status from public.profiles p where p.id=v_user_id;
  if v_status <> 'active' or v_role not in ('warga_biasa','warga_tidak_biasa','warga_sultan') then
    raise exception 'Wishlist hanya tersedia untuk member Warga aktif.';
  end if;
  insert into public.member_package_wishlist(user_id,product_code)
    values(v_user_id,v_code) on conflict(user_id,product_code) do nothing;
  return true;
end;
$$;

create or replace function private.remove_my_package_from_wishlist(p_product_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Login diperlukan.'; end if;
  delete from public.member_package_wishlist
    where user_id=v_user_id and product_code=upper(trim(coalesce(p_product_code,'')));
  return true;
end;
$$;

-- Public RPC endpoints are SECURITY INVOKER wrappers only.
create or replace function public.get_my_package_wishlist()
returns table(product_code text, created_at timestamptz)
language sql
security invoker
set search_path = ''
as $$ select * from private.get_my_package_wishlist(); $$;

create or replace function public.add_my_package_to_wishlist(p_product_code text)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.add_my_package_to_wishlist(p_product_code); $$;

create or replace function public.remove_my_package_from_wishlist(p_product_code text)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.remove_my_package_from_wishlist(p_product_code); $$;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke all on function private.get_my_package_wishlist() from public, anon;
revoke all on function private.add_my_package_to_wishlist(text) from public, anon;
revoke all on function private.remove_my_package_from_wishlist(text) from public, anon;
grant execute on function private.get_my_package_wishlist() to authenticated;
grant execute on function private.add_my_package_to_wishlist(text) to authenticated;
grant execute on function private.remove_my_package_from_wishlist(text) to authenticated;

revoke all on function public.get_my_package_wishlist() from public, anon;
revoke all on function public.add_my_package_to_wishlist(text) from public, anon;
revoke all on function public.remove_my_package_from_wishlist(text) from public, anon;
grant execute on function public.get_my_package_wishlist() to authenticated;
grant execute on function public.add_my_package_to_wishlist(text) to authenticated;
grant execute on function public.remove_my_package_from_wishlist(text) to authenticated;
