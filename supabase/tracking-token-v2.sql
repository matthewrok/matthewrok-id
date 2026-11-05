-- MATTHEW JOKI — secure tracking token v2 (expand phase)
-- Apply only after PR #13 is merged and the matching frontend is ready to publish.
-- This migration is additive: legacy token/order_number values are preserved for rollback.
-- It creates independent 256-bit tracking tokens for all existing rows and new inserts.
-- Legacy public RPCs remain temporarily available for a controlled compatibility window;
-- apply tracking-token-v2-cutover.sql only after the new frontend is live and verified.

begin;

alter table public.joki_progress
  add column if not exists tracking_token text;

update public.joki_progress
set tracking_token = 'MJ-' || upper(encode(extensions.gen_random_bytes(32), 'hex'))
where tracking_token is null;

create unique index if not exists joki_progress_tracking_token_uidx
  on public.joki_progress (upper(tracking_token));

alter table public.joki_progress
  alter column tracking_token set not null;

create or replace function public.ensure_joki_tracking_token()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.tracking_token is null or btrim(new.tracking_token) = '' then
    new.tracking_token := 'MJ-' || upper(encode(extensions.gen_random_bytes(32), 'hex'));
  end if;
  return new;
end;
$function$;

revoke all on function public.ensure_joki_tracking_token() from public, anon, authenticated;

drop trigger if exists trg_ensure_joki_tracking_token on public.joki_progress;
create trigger trg_ensure_joki_tracking_token
before insert on public.joki_progress
for each row execute function public.ensure_joki_tracking_token();

create or replace function public.create_joki_order_secure(
  p_client_name text,
  p_client_email text,
  p_product_code text,
  p_quantity integer,
  p_voucher_code text,
  p_kingdom_number text
)
returns table(
  order_number text,
  client_name text,
  client_email text,
  service_name text,
  quantity integer,
  unit_price integer,
  total_price integer,
  status text,
  voucher_code text,
  discount_amount integer,
  subtotal_price integer,
  kingdom_number text,
  tracking_token text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_account_status text;
  v_email text;
  v_order record;
  v_tracking_token text;
begin
  if v_user_id is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'Pemesanan hanya tersedia untuk akun yang sudah login.';
  end if;

  select lower(trim(p.role)), lower(trim(p.account_status))
    into v_role, v_account_status
  from public.profiles p
  where p.id = v_user_id;

  if v_role not in ('member', 'sultan', 'matthew', 'pelanggan')
     or v_account_status is distinct from 'active' then
    raise exception 'Akun ini tidak memiliki izin untuk membuat pesanan.';
  end if;

  select lower(trim(u.email))
    into v_email
  from auth.users u
  where u.id = v_user_id
    and u.email_confirmed_at is not null;

  if v_email is null or v_email = '' then
    raise exception 'Email akun harus diverifikasi sebelum membuat pesanan.';
  end if;

  select * into v_order
  from public.create_joki_order(
    p_client_name,
    v_email,
    p_product_code,
    p_quantity,
    p_voucher_code,
    p_kingdom_number
  );

  if v_order.order_number is null then
    raise exception 'Pesanan gagal dibuat.';
  end if;

  select j.tracking_token into v_tracking_token
  from public.joki_progress j
  where j.order_number = v_order.order_number
  limit 1;

  if v_tracking_token is null then
    raise exception 'Token pelacakan gagal dibuat.';
  end if;

  return query select
    v_order.order_number::text,
    v_order.client_name::text,
    v_order.client_email::text,
    v_order.service_name::text,
    v_order.quantity::integer,
    v_order.unit_price::integer,
    v_order.total_price::integer,
    v_order.status::text,
    v_order.voucher_code::text,
    v_order.discount_amount::integer,
    v_order.subtotal_price::integer,
    v_order.kingdom_number::text,
    v_tracking_token::text;
end;
$function$;

revoke all on function public.create_joki_order_secure(text,text,text,integer,text,text) from public, anon;
grant execute on function public.create_joki_order_secure(text,text,text,integer,text,text) to authenticated;

create or replace function public.lookup_joki_progress_secure(p_token text)
returns table(
  order_number text,
  client_name text,
  service_name text,
  quantity integer,
  total_price integer,
  status text,
  progress_percent integer,
  progress_note text,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select
    j.order_number,
    j.client_name,
    j.service_name,
    j.quantity,
    j.total_price,
    j.status,
    j.progress_percent,
    j.progress_note,
    j.updated_at
  from public.joki_progress j
  where j.tracking_token = upper(trim(coalesce(p_token, '')))
  limit 1;
$function$;

revoke all on function public.lookup_joki_progress_secure(text) from public;
grant execute on function public.lookup_joki_progress_secure(text) to anon, authenticated;

create or replace function public.lookup_joki_review_secure(p_token text)
returns table(rating integer, review_text text)
language sql
security definer
set search_path = ''
as $function$
  select r.rating, r.review_text
  from public.joki_reviews r
  join public.joki_progress j on j.id = r.joki_progress_id
  where j.tracking_token = upper(trim(coalesce(p_token, '')))
  limit 1;
$function$;

revoke all on function public.lookup_joki_review_secure(text) from public;
grant execute on function public.lookup_joki_review_secure(text) to anon, authenticated;

create or replace function public.submit_joki_review_secure(
  p_token text,
  p_rating integer,
  p_review_text text default '',
  p_display_name boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.joki_progress%rowtype;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating harus antara 1 sampai 5 bintang.';
  end if;
  if char_length(coalesce(p_review_text, '')) > 700 then
    raise exception 'Ulasan maksimal 700 karakter.';
  end if;

  select * into v_order
  from public.joki_progress j
  where j.tracking_token = upper(trim(coalesce(p_token, '')))
  limit 1;

  if not found then raise exception 'Token pelacakan tidak ditemukan.'; end if;
  if v_order.status <> 'Selesai' then
    raise exception 'Ulasan hanya bisa diberikan setelah pesanan berstatus Selesai.';
  end if;

  insert into public.joki_reviews(
    joki_progress_id, client_name, rating, review_text, display_name
  )
  values (
    v_order.id, v_order.client_name, p_rating,
    trim(coalesce(p_review_text, '')), coalesce(p_display_name, false)
  );
exception
  when unique_violation then
    raise exception 'Token ini sudah digunakan untuk memberi ulasan.';
end;
$function$;

revoke all on function public.submit_joki_review_secure(text,integer,text,boolean) from public;
grant execute on function public.submit_joki_review_secure(text,integer,text,boolean) to anon, authenticated;

commit;
