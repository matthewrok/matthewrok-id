-- Enforce System Maintenance for private Inbox reads and read receipts.
-- Admins retain access for operational recovery and official notices.

begin;

create or replace function public.is_maintenance_module_blocked(p_module text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when not exists(select 1 from public.site_maintenance_config m where m.id=true) then true
    else exists(
      select 1
      from public.site_maintenance_config m
      where m.id=true and m.enabled
        and (
          m.mode='full'
          or (m.mode='orders' and p_module='orders')
          or (m.mode='system' and p_module=any(m.affected_modules))
        )
    )
  end;
$function$;

revoke all on function public.is_maintenance_module_blocked(text) from public, anon;
grant execute on function public.is_maintenance_module_blocked(text) to authenticated;

drop policy if exists "Members read addressed inbox messages" on public.inbox_messages;
create policy "Members read addressed inbox messages outside maintenance"
on public.inbox_messages
for select
to authenticated
using (
  (
    exists(
      select 1 from public.inbox_recipients r
      where r.message_id=inbox_messages.id
        and r.user_id=(select auth.uid())
    )
    and not (select public.is_maintenance_module_blocked('inbox'))
  )
  or (select public.is_admin())
);

drop policy if exists "Members read own inbox receipt" on public.inbox_recipients;
create policy "Members read own inbox receipt outside maintenance"
on public.inbox_recipients
for select
to authenticated
using (
  (user_id=(select auth.uid()) and not (select public.is_maintenance_module_blocked('inbox')))
  or (select public.is_admin())
);

drop policy if exists "Members update own inbox receipt" on public.inbox_recipients;
create policy "Members update own inbox receipt outside maintenance"
on public.inbox_recipients
for update
to authenticated
using (
  (user_id=(select auth.uid()) and not (select public.is_maintenance_module_blocked('inbox')))
  or (select public.is_admin())
)
with check (
  (user_id=(select auth.uid()) and not (select public.is_maintenance_module_blocked('inbox')))
  or (select public.is_admin())
);

commit;
