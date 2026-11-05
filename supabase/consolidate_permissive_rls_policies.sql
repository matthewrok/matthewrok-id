-- Consolidate duplicate permissive SELECT policies without widening access.
-- Public users retain only active/public rows. Authenticated admins retain full
-- operational visibility and write access where table grants already allow it.

begin;

-- PROFILES: one authenticated SELECT policy for self, admin, or Matthew operator.
drop policy if exists "MATTHEW can view profiles for inbox" on public.profiles;
drop policy if exists "Users and admins can view profiles" on public.profiles;
create policy "Users admins and Matthew can view profiles"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
  or (select private.is_matthew_operator())
);

-- SITE NOTIFICATIONS: split public visibility from authenticated/admin visibility.
drop policy if exists "Admins manage site notifications" on public.site_notifications;
drop policy if exists "Everyone reads active site notifications" on public.site_notifications;

create policy "Public reads active all-audience notifications"
on public.site_notifications
for select
to anon
using (
  is_active = true
  and starts_at <= now()
  and (expires_at is null or expires_at > now())
  and audience = 'all'
);

create policy "Members and admins read notifications"
on public.site_notifications
for select
to authenticated
using (
  (
    is_active = true
    and starts_at <= now()
    and (expires_at is null or expires_at > now())
  )
  or (select public.is_current_user_admin())
);

create policy "Admins insert site notifications"
on public.site_notifications
for insert
to authenticated
with check ((select public.is_current_user_admin()));

create policy "Admins update site notifications"
on public.site_notifications
for update
to authenticated
using ((select public.is_current_user_admin()))
with check ((select public.is_current_user_admin()));

create policy "Admins delete site notifications"
on public.site_notifications
for delete
to authenticated
using ((select public.is_current_user_admin()));

-- VOUCHERS: public sees only currently usable vouchers; admins see all.
drop policy if exists "Admins manage vouchers" on public.vouchers;
drop policy if exists "Public can view active vouchers" on public.vouchers;

create policy "Public reads usable vouchers"
on public.vouchers
for select
to anon
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (expires_at is null or expires_at > now())
  and (max_uses is null or used_count < max_uses)
);

create policy "Members and admins read vouchers"
on public.vouchers
for select
to authenticated
using (
  (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at > now())
    and (max_uses is null or used_count < max_uses)
  )
  or (select public.is_current_user_admin())
);

create policy "Admins insert vouchers"
on public.vouchers
for insert
to authenticated
with check ((select public.is_current_user_admin()));

create policy "Admins update vouchers"
on public.vouchers
for update
to authenticated
using ((select public.is_current_user_admin()))
with check ((select public.is_current_user_admin()));

create policy "Admins delete vouchers"
on public.vouchers
for delete
to authenticated
using ((select public.is_current_user_admin()));

-- WORKER APPLICATIONS: service_role performs writes through the Edge Function
-- and Telegram decision RPC. Authenticated clients retain read-own/admin access.
drop policy if exists "Admins manage worker applications" on public.worker_applications;
drop policy if exists "Applicants read own applications" on public.worker_applications;

create policy "Applicants and operators read worker applications"
on public.worker_applications
for select
to authenticated
using (
  applicant_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin'::text, 'MATTHEW'::text])
  )
);

commit;
