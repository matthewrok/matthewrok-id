-- Canonical daily City Hall discount configuration.
-- Replaces all previously deployed 5%-12% function variants with 3%-8% only.
-- Keep historical timestamped migrations for auditability; this is the final active definition.
-- Conservative weighted daily City Hall discounts.
-- Discount rates: 3=30%, 4=25%, 5=20%, 6=12%, 7=8%, 8=5%.
-- Product count: 1=45%, 2=30%, 3=17%, 4=6%, 5=1.5%, 6=0.5%.
-- Minimum characters: 4=10%, 6=25%, 8=35%, 10=30%.
-- Only CH11-CH17 are eligible; Action Point / Lohar is always excluded.
-- Offers remain deterministic for each Asia/Jakarta calendar day.

create or replace function public.get_daily_joki_discounts()
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
  daily_count as (
    select d.discount_date,
      case
        when (get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) * 256
          + get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 1)) % 1000 < 450 then 1
        when (get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) * 256
          + get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 1)) % 1000 < 750 then 2
        when (get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) * 256
          + get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 1)) % 1000 < 920 then 3
        when (get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) * 256
          + get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 1)) % 1000 < 980 then 4
        when (get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) * 256
          + get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 1)) % 1000 < 995 then 5
        else 6
      end as product_count
    from local_day d
  ),
  scored as (
    select p.product_code, d.discount_date, c.product_count,
      md5(d.discount_date::text || ':' || p.product_code) as seed,
      row_number() over (
        order by md5(d.discount_date::text || ':' || p.product_code), p.product_code
      ) as daily_rank
    from product_codes p
    cross join local_day d
    join daily_count c on c.discount_date = d.discount_date
  ),
  selected as (
    select s.*,
      (get_byte(decode(md5(s.discount_date::text || ':' || s.product_code || ':discount-percent'), 'hex'), 0) * 256
        + get_byte(decode(md5(s.discount_date::text || ':' || s.product_code || ':discount-percent'), 'hex'), 1)) % 10000 as discount_roll
    from scored s
    where s.daily_rank <= s.product_count
  )
  select
    s.product_code,
    case
      when s.discount_roll < 3000 then 3
      when s.discount_roll < 5500 then 4
      when s.discount_roll < 7500 then 5
      when s.discount_roll < 8700 then 6
      when s.discount_roll < 9500 then 7
      else 8
    end::integer as discount_percent,
    case
      when (get_byte(decode(s.seed, 'hex'), 6) * 256
        + get_byte(decode(s.seed, 'hex'), 7)) % 100 < 10 then 4
      when (get_byte(decode(s.seed, 'hex'), 6) * 256
        + get_byte(decode(s.seed, 'hex'), 7)) % 100 < 35 then 6
      when (get_byte(decode(s.seed, 'hex'), 6) * 256
        + get_byte(decode(s.seed, 'hex'), 7)) % 100 < 70 then 8
      else 10
    end::integer,
    s.discount_date
  from selected s;
$function$;

revoke all on function public.get_daily_joki_discounts() from public;
grant execute on function public.get_daily_joki_discounts() to anon, authenticated;
