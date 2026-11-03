-- Jalankan sekali di Supabase SQL Editor.
-- Menyimpan nama pengunjung tanpa membuat akun/auth user.
create table if not exists public.visitor_logs (
  id bigint generated always as identity primary key,
  visitor_name text not null check (char_length(btrim(visitor_name)) between 2 and 60),
  visited_at timestamptz not null default now()
);

alter table public.visitor_logs enable row level security;

grant insert on table public.visitor_logs to anon, authenticated;
grant select on table public.visitor_logs to authenticated;

drop policy if exists "Anyone can record a visitor" on public.visitor_logs;
create policy "Anyone can record a visitor"
on public.visitor_logs
for insert
to anon, authenticated
with check (
  char_length(btrim(visitor_name)) between 2 and 60
);

drop policy if exists "Admins can view visitor logs" on public.visitor_logs;
create policy "Admins can view visitor logs"
on public.visitor_logs
for select
to authenticated
using (public.is_admin());
