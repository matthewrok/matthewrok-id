-- Ensure suspended admin accounts lose every helper-based admin privilege.
-- CREATE OR REPLACE preserves the existing function signatures and grants.

begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(trim(p.role)) = 'admin'
      and lower(trim(p.account_status)) = 'active'
  );
$function$;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and lower(trim(p.role)) = 'admin'
      and lower(trim(p.account_status)) = 'active'
  );
$function$;

commit;
