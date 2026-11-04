-- MATTHEW JOKI: read-only preflight for the order/tracking-token migration.
-- Safe to run in Supabase SQL Editor: this script performs SELECTs only.
-- Review every result before preparing or applying any DDL.

-- 1) Current order/progress columns, nullability, defaults.
select
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'joki_progress'
order by c.ordinal_position;

-- 2) Constraints and indexes that may depend on token/order_number.
select
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public'
  and rel.relname = 'joki_progress'
order by con.conname;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'joki_progress'
order by indexname;

-- 3) Function signatures, return contracts, security mode, and definitions.
select
  p.oid::regprocedure as function_signature,
  pg_get_function_result(p.oid) as return_type,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_joki_order',
    'list_my_joki_orders',
    'lookup_joki_progress',
    'lookup_joki_review',
    'submit_joki_review',
    'get_public_joki_reviews'
  )
order by p.proname, p.oid::regprocedure::text;

-- 4) Explicit function grants. Check anon/public access before changing lookup contracts.
select
  p.oid::regprocedure as function_signature,
  coalesce(r.rolname, 'PUBLIC') as grantee,
  a.privilege_type,
  a.is_grantable
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
left join pg_roles r on r.oid = a.grantee
where n.nspname = 'public'
  and p.proname in (
    'create_joki_order',
    'list_my_joki_orders',
    'lookup_joki_progress',
    'lookup_joki_review',
    'submit_joki_review',
    'get_public_joki_reviews'
  )
order by p.proname, p.oid::regprocedure::text, grantee;

-- 5) Database objects whose stored definitions reference the progress table.
-- This is a useful review aid, not a complete substitute for dependency analysis.
select
  n.nspname as schema_name,
  p.proname as routine_name,
  p.oid::regprocedure as routine_signature,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where pg_get_functiondef(p.oid) ilike '%joki_progress%'
order by n.nspname, p.proname;

-- 6) Row counts and legacy token shape. Do not expose actual tokens in this report.
select
  count(*) as total_rows,
  count(*) filter (where order_number is not null) as rows_with_order_number,
  count(*) filter (where token is not null) as rows_with_legacy_token,
  count(*) filter (where token ~ '^MJ-[0-9]{6}-[A-F0-9]{8}$') as rows_matching_legacy_order_code,
  count(*) filter (where token ~ '^MJ-([A-F0-9]{8}-){7}[A-F0-9]{8}$') as rows_matching_256_bit_admin_token
from public.joki_progress;

-- 7) Check duplicate order numbers (should be zero before enforcing uniqueness).
select order_number, count(*) as occurrences
from public.joki_progress
where order_number is not null
group by order_number
having count(*) > 1
order by occurrences desc, order_number;

-- 8) Edge-function configuration is managed outside SQL; verify manually in Supabase
-- Dashboard before release. Preserve manual auth/secret validation in Telegram and inbox
-- functions even if verify_jwt settings are reviewed.
