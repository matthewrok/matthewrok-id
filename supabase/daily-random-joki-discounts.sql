-- Daily randomized discounts shared by the catalog and trusted order pricing.
-- Two of eight product groups receive a deterministic 5%-12% discount per Asia/Jakarta day.
-- The same date/product hash is used for display and server-side order validation.

create or replace function public.get_daily_joki_discounts()
returns table (product_code text, discount_percent integer, discount_date date)
language sql
stable
set search_path = ''
as $function$
  with product_codes(product_code) as (
    values ('CH11'::text), ('CH12'::text), ('CH13'::text), ('CH14'::text),
           ('CH15'::text), ('CH16'::text), ('CH17'::text), ('AP-LOHAR'::text)
  ),
  local_day as (
    select (now() at time zone 'Asia/Jakarta')::date as discount_date
  ),
  scored as (
    select p.product_code, d.discount_date,
      row_number() over (order by md5(d.discount_date::text || ':' || p.product_code), p.product_code) as daily_rank,
      5 + (get_byte(decode(md5(d.discount_date::text || ':' || p.product_code), 'hex'), 4) % 8) as discount_percent
    from product_codes p cross join local_day d
  )
  select s.product_code, s.discount_percent, s.discount_date
  from scored s where s.daily_rank <= 2;
$function$;

revoke all on function public.get_daily_joki_discounts() from public;
grant execute on function public.get_daily_joki_discounts() to anon, authenticated;

DO $migration$
DECLARE
  v_definition text;
  v_old_ch12 text;
  v_new_ch12 text;
  v_anchor text;
  v_logic text;
BEGIN
  v_old_ch12 := 'elsif p_product_code=''CH12'' then v_service:=''City Hall 12''; v_price:=29000;';
  v_new_ch12 := 'elsif p_product_code=''CH12-KOSONGAN'' then v_service:=''City Hall 12 - KOSONGAN (Tanpa Resource)''; v_price:=29000;
  elsif p_product_code=''CH12-ISIAN'' then v_service:=''City Hall 12 - ISIAN (Resource 10-15M+)''; v_price:=35000;
  elsif p_product_code=''CH12'' then v_service:=''City Hall 12''; v_price:=29000;';
  v_anchor := E'  if exists (\n    select 1 from public.site_maintenance_config m';
  v_logic := E'  select d.discount_percent into v_daily_discount\n  from public.get_daily_joki_discounts() d\n  where d.product_code = case\n    when p_product_code in (''CH12-KOSONGAN'', ''CH12-ISIAN'') then ''CH12''\n    else p_product_code\n  end;\n  if v_daily_discount is not null then\n    v_price := round(v_price::numeric * (100 - v_daily_discount) / 100)::integer;\n  end if;\n\n';

  SELECT pg_get_functiondef('public.create_joki_order(text,text,text,integer,text,text)'::regprocedure)
  INTO v_definition;

  IF strpos(v_definition, v_old_ch12) = 0 THEN
    RAISE EXCEPTION 'CH12 product pricing block not found; migration aborted.';
  END IF;
  IF strpos(v_definition, '  v_discount integer := 0;') = 0 THEN
    RAISE EXCEPTION 'Order discount declaration not found; migration aborted.';
  END IF;
  IF strpos(v_definition, v_anchor) = 0 THEN
    RAISE EXCEPTION 'Daily discount insertion point not found; migration aborted.';
  END IF;

  v_definition := replace(v_definition, '  v_discount integer := 0;', '  v_discount integer := 0;' || E'\n' || '  v_daily_discount integer;');
  v_definition := replace(v_definition, v_old_ch12, v_new_ch12);
  v_definition := replace(v_definition, v_anchor, v_logic || v_anchor);
  EXECUTE v_definition;
END;
$migration$;
