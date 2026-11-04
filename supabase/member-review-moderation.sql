-- MATTHEW JOKI: member review submission and admin moderation.
-- Existing joki_reviews table and admin RLS policy are defined in joki-reviews-setup.sql.
alter table public.joki_reviews
  add column if not exists moderation_status text not null default 'pending'
  check (moderation_status in ('pending','approved','rejected'));

create or replace function public.submit_member_joki_review(
  p_order_id uuid,
  p_rating integer,
  p_review_text text default '',
  p_display_name boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.joki_progress%rowtype;
  v_email text;
begin
  if auth.uid() is null then raise exception 'Silakan login untuk mengirim ulasan.'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Rating harus antara 1 sampai 5 bintang.'; end if;
  if char_length(btrim(coalesce(p_review_text,''))) < 5 or char_length(coalesce(p_review_text,'')) > 700 then
    raise exception 'Ulasan harus 5–700 karakter.'; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  select * into v_order from public.joki_progress
    where id = p_order_id and lower(coalesce(client_email,'')) = v_email for share;
  if not found then raise exception 'Pesanan tidak ditemukan pada akun ini.'; end if;
  if v_order.status <> 'Selesai' then raise exception 'Ulasan hanya dapat diberikan setelah pesanan selesai.'; end if;
  insert into public.joki_reviews(joki_progress_id,client_name,rating,review_text,display_name,moderation_status)
  values(v_order.id,v_order.client_name,p_rating,btrim(p_review_text),coalesce(p_display_name,false),'approved');
exception when unique_violation then raise exception 'Pesanan ini sudah memiliki ulasan.';
end;
$$;

revoke all on function public.submit_member_joki_review(uuid,integer,text,boolean) from public;
grant execute on function public.submit_member_joki_review(uuid,integer,text,boolean) to authenticated;

-- Public endpoint only returns admin-approved reviews. Names are shown only with client consent.
create or replace function public.get_public_joki_reviews()
returns table(client_name text,rating integer,review_text text,created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select case when r.display_name then r.client_name else 'Client Matthew' end,
         r.rating,r.review_text,r.created_at
  from public.joki_reviews r
  where r.moderation_status = 'approved'
  order by r.created_at desc
  limit 30;
$$;
revoke all on function public.get_public_joki_reviews() from public;
grant execute on function public.get_public_joki_reviews() to anon,authenticated;
