-- JOKI MATTHEW: progress tracker setup for Supabase
-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.joki_progress (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  client_name text not null,
  service_name text not null,
  status text not null default 'Menunggu'
    check (status in ('Menunggu','Dalam pengerjaan','Menunggu konfirmasi client','Selesai','Ditunda')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  progress_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists joki_progress_token_upper_idx on public.joki_progress (upper(token));
alter table public.joki_progress enable row level security;

drop policy if exists "Admins manage joki progress" on public.joki_progress;
create policy "Admins manage joki progress" on public.joki_progress
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create or replace function public.lookup_joki_progress(p_token text)
returns table (
  client_name text,
  service_name text,
  status text,
  progress_percent integer,
  progress_note text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select j.client_name, j.service_name, j.status, j.progress_percent, j.progress_note, j.updated_at
  from public.joki_progress j
  where upper(j.token) = upper(trim(p_token))
  limit 1;
$$;
revoke all on function public.lookup_joki_progress(text) from public;
grant execute on function public.lookup_joki_progress(text) to anon, authenticated;
grant select, insert, update, delete on public.joki_progress to authenticated;
