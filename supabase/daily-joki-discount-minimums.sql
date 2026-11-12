-- Daily City Hall-only discounts with an even randomized minimum character threshold.
-- 2 of 7 City Hall products receive 5%-12% off each Jakarta day.
-- Minimum quantity is deterministic per day/product and selected from 4, 6, 8, or 10.

drop function if exists public.get_daily_joki_discounts();

create function public.get_daily_joki_discounts()
returns table (
  product_code text,
  discount_percent integer,
  minimum_characters integer,
  discount_date date
)
language sql
stable
set search_path = ''
as $function$
  with product_codes(product_code) as (
    values ('CH11'::text), ('CH12'::text), ('CH13'::text), ('CH14'::text),
           ('CH15'::text), ('CH16'::text), ('CH17'::text)
  ),
  local_day as (
    select (now() at time zone 'Asia/Jakarta')::date as discount_date
  ),
  scored as (
    select p.product_code, d.discount_date,
      md5(d.discount_date::text || ':' || p.product_code) as seed,
      row_number() over (order by md5(d.discount_date::text || ':' || p.product_code), p.product_code) as daily_rank
    from product_codes p cross join local_day d
  )
  select
    s.product_code,
    5 + (get_byte(decode(s.seed, 'hex'), 4) % 8)::integer as discount_percent,
    (array[4,6,8,10])[(get_byte(decode(s.seed, 'hex'), 5) % 4) + 1]::integer as minimum_characters,
    s.discount_date
  from scored s
  where s.daily_rank <= 2;
$function$;

revoke all on function public.get_daily_joki_discounts() from public;
grant execute on function public.get_daily_joki_discounts() to anon, authenticated;

DO $migration$
DECLARE
  v_definition text;
  v_old_select text;
  v_new_select text;
  v_old_apply text;
  v_new_apply text;
BEGIN
  SELECT pg_get_functiondef('public.create_joki_order(text,text,text,integer,text,text)'::regprocedure)
    INTO v_definition;

  IF strpos(v_definition, 'v_daily_minimum integer;') = 0 THEN
    v_definition := replace(
      v_definition,
      '  v_daily_discount integer;',
      '  v_daily_discount integer;' || E'\n' || '  v_daily_minimum integer;'
    );
  END IF;

  v_old_select := E'  select d.discount_percent into v_daily_discount\n  from public.get_daily_joki_discounts() d\n  where d.product_code = case\n    when p_product_code in (''CH12-KOSONGAN'', ''CH12-ISIAN'') then ''CH12''\n    else p_product_code\n  end;';
  v_new_select := E'  select d.discount_percent, d.minimum_characters\n    into v_daily_discount, v_daily_minimum\n  from public.get_daily_joki_discounts() d\n  where d.product_code = case\n    when p_product_code in (''CH12-KOSONGAN'', ''CH12-ISIAN'') then ''CH12''\n    else p_product_code\n  end;';

  v_old_apply := E'  if v_daily_discount is not null then\n    v_price := round(v_price::numeric * (100 - v_daily_discount) / 100)::integer;\n  end if;';
  v_new_apply := E'  if v_daily_discount is not null and v_daily_minimum is not null and p_quantity >= v_daily_minimum then\n    v_price := round(v_price::numeric * (100 - v_daily_discount) / 100)::integer;\n  end if;';

  IF strpos(v_definition, v_old_select) = 0 THEN
    RAISE EXCEPTION 'Existing daily discount lookup not found; migration aborted.';
  END IF;
  IF strpos(v_definition, v_old_apply) = 0 THEN
    RAISE EXCEPTION 'Existing daily discount pricing block not found; migration aborted.';
  END IF;

  v_definition := replace(v_definition, v_old_select, v_new_select);
  v_definition := replace(v_definition, v_old_apply, v_new_apply);
  EXECUTE v_definition;
END;
$migration$;
