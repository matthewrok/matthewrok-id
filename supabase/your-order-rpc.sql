-- Your Order: secure RPC listing orders belonging to the authenticated account email.
-- Applied to production Supabase as migration add_my_joki_orders_rpc.
create or replace function public.list_my_joki_orders()
returns table (
  id uuid,
  order_number text,
  client_name text,
  client_email text,
  service_name text,
  quantity integer,
  unit_price integer,
  subtotal_price integer,
  voucher_code text,
  discount_amount integer,
  total_price integer,
  status text,
  progress_percent integer,
  progress_note text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Login diperlukan untuk melihat pesanan.';
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = auth.uid();
  if v_email is null or v_email = '' then return; end if;
  return query
  select j.id, j.order_number, j.client_name, j.client_email, j.service_name,
         j.quantity, j.unit_price, j.subtotal_price, j.voucher_code,
         j.discount_amount, j.total_price, j.status, j.progress_percent,
         j.progress_note, j.created_at, j.updated_at
  from public.joki_progress j
  where lower(coalesce(j.client_email, '')) = v_email
    and j.order_number is not null
  order by j.created_at desc;
end;
$$;
revoke all on function public.list_my_joki_orders() from public, anon;
grant execute on function public.list_my_joki_orders() to authenticated;
