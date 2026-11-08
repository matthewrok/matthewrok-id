-- Follow-up hardening: allow any active, verified account to recover only its own
-- order token. A member may be promoted to admin/worker after placing an order;
-- changing roles must not lock the owner out of their own tracking token.
-- Ownership remains bound to auth.uid() -> verified auth.users.email -> client_email.

begin;

create or replace function public.get_my_joki_tracking_token(p_order_number text)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_account_status text;
  v_tracking_token text;
begin
  if v_user_id is null
     or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'Login diperlukan untuk mengambil token pelacakan.';
  end if;

  if p_order_number is null or btrim(p_order_number) = '' then
    raise exception 'Nomor pesanan tidak valid.';
  end if;

  select lower(trim(u.email))
    into v_email
  from auth.users u
  where u.id = v_user_id
    and u.email_confirmed_at is not null;

  if v_email is null or v_email = '' then
    raise exception 'Gunakan akun dengan email yang sudah diverifikasi.';
  end if;

  select lower(trim(p.account_status))
    into v_account_status
  from public.profiles p
  where p.id = v_user_id;

  if v_account_status is distinct from 'active' then
    raise exception 'Akun tidak aktif tidak dapat mengambil token pesanan.';
  end if;

  select j.tracking_token
    into v_tracking_token
  from public.joki_progress j
  where j.order_number = btrim(p_order_number)
    and lower(trim(coalesce(j.client_email, ''))) = v_email
    and j.tracking_token is not null
  limit 1;

  if v_tracking_token is null then
    raise exception 'Token pesanan tidak ditemukan untuk akun ini. Pastikan kamu login dengan akun yang digunakan saat memesan.';
  end if;

  return v_tracking_token;
end;
$function$;

revoke all on function public.get_my_joki_tracking_token(text) from public, anon;
grant execute on function public.get_my_joki_tracking_token(text) to authenticated;

commit;
