-- JOKI MATTHEW: client reviews and 1–5 star ratings
-- Run this file once in Supabase Dashboard > SQL Editor AFTER joki-progress-setup.sql.
-- It adds a separate table and RPCs; it does not delete or replace existing orders.
create table if not exists public.joki_reviews (
  id uuid primary key default gen_random_uuid(),
  joki_progress_id uuid not null unique references public.joki_progress(id) on delete cascade,
  client_name text not null,
  rating integer not null check (rating between 1 and 5),
  review_text text not null default '' check (char_length(review_text) <= 700),
  display_name boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.joki_reviews enable row level security;

-- No direct anonymous access to review records. Public access is through the limited RPC below.
revoke all on public.joki_reviews from anon, authenticated;
grant select, insert, update, delete on public.joki_reviews to authenticated;

drop policy if exists "Admins manage joki reviews" on public.joki_reviews;
create policy "Admins manage joki reviews" on public.joki_reviews
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create or replace function public.submit_joki_review(
  p_token text, p_rating integer, p_review_text text default '', p_display_name boolean default false
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_order public.joki_progress%rowtype;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Rating harus antara 1 sampai 5 bintang.'; end if;
  if char_length(coalesce(p_review_text, '')) > 700 then raise exception 'Ulasan maksimal 700 karakter.'; end if;
  select * into v_order from public.joki_progress where upper(token) = upper(trim(p_token)) limit 1;
  if not found then raise exception 'Token tidak ditemukan.'; end if;
  if v_order.status <> 'Selesai' then raise exception 'Ulasan hanya bisa diberikan setelah pesanan berstatus Selesai.'; end if;
  insert into public.joki_reviews (joki_progress_id, client_name, rating, review_text, display_name)
  values (v_order.id, v_order.client_name, p_rating, trim(coalesce(p_review_text, '')), coalesce(p_display_name, false));
exception when unique_violation then raise exception 'Token ini sudah digunakan untuk memberi ulasan.';
end;
$$;

create or replace function public.lookup_joki_review(p_token text)
returns table (rating integer, review_text text)
language sql security definer set search_path = public
as $$
  select r.rating, r.review_text from public.joki_reviews r
  join public.joki_progress j on j.id = r.joki_progress_id
  where upper(j.token) = upper(trim(p_token)) limit 1;
$$;

create or replace function public.get_public_joki_reviews()
returns table (client_name text, rating integer, review_text text, created_at timestamptz)
language sql security definer set search_path = public
as $$
  select case when r.display_name then r.client_name else 'Client Matthew' end,
         r.rating, r.review_text, r.created_at
  from public.joki_reviews r
  order by r.created_at desc limit 30;
$$;

revoke all on function public.submit_joki_review(text, integer, text, boolean) from public;
revoke all on function public.lookup_joki_review(text) from public;
revoke all on function public.get_public_joki_reviews() from public;
grant execute on function public.submit_joki_review(text, integer, text, boolean) to anon, authenticated;
grant execute on function public.lookup_joki_review(text) to anon, authenticated;
grant execute on function public.get_public_joki_reviews() to anon, authenticated;
