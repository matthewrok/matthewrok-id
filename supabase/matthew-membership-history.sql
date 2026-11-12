-- Matthew Joki — Warga Membership History.
-- Records a baseline when tracking starts, then every automatic tier transition.
-- Historical role dates are not fabricated: existing members begin with a baseline snapshot.

begin;

create schema if not exists private;

create table if not exists public.warga_membership_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_role text,
  new_role text not null check (new_role in ('warga biasa','warga tidak biasa','warga sultan')),
  completed_orders integer not null default 0 check (completed_orders >= 0),
  event_type text not null check (event_type in ('baseline','promotion','demotion')),
  changed_at timestamptz not null default now()
);

create index if not exists warga_membership_history_user_changed_idx
  on public.warga_membership_history(user_id, changed_at desc, id desc);
create unique index if not exists warga_membership_history_one_baseline_idx
  on public.warga_membership_history(user_id) where event_type = 'baseline';

alter table public.warga_membership_history enable row level security;
revoke all on public.warga_membership_history from public, anon, authenticated;

create or replace function private.capture_warga_membership_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text;
  v_completed integer := 0;
  v_old_role text;
  v_new_role text;
  v_event text;
begin
  v_new_role := lower(trim(coalesce(new.role,'')));

  if tg_op = 'INSERT' then
    if v_new_role not in ('warga biasa','warga tidak biasa','warga sultan') then
      return new;
    end if;

    select lower(trim(u.email)) into v_email
    from auth.users u where u.id = new.id;

    if v_email is not null then
      select count(*)::integer into v_completed
      from public.joki_progress j
      where lower(trim(coalesce(j.client_email,''))) = v_email
        and lower(trim(coalesce(j.status,''))) = 'selesai';
    end if;

    insert into public.warga_membership_history(
      user_id, previous_role, new_role, completed_orders, event_type
    ) values (new.id, null, v_new_role, v_completed, 'baseline')
    on conflict (user_id) where event_type = 'baseline' do nothing;

    return new;
  end if;

  v_old_role := lower(trim(coalesce(old.role,'')));
  if v_old_role = v_new_role
     or v_old_role not in ('warga biasa','warga tidak biasa','warga sultan')
     or v_new_role not in ('warga biasa','warga tidak biasa','warga sultan') then
    return new;
  end if;

  select lower(trim(u.email)) into v_email
  from auth.users u where u.id = new.id;

  if v_email is not null then
    select count(*)::integer into v_completed
    from public.joki_progress j
    where lower(trim(coalesce(j.client_email,''))) = v_email
      and lower(trim(coalesce(j.status,''))) = 'selesai';
  end if;

  v_event := case
    when case v_new_role
      when 'warga biasa' then 1
      when 'warga tidak biasa' then 2
      when 'warga sultan' then 3
      else 0
    end >
    case v_old_role
      when 'warga biasa' then 1
      when 'warga tidak biasa' then 2
      when 'warga sultan' then 3
      else 0
    end then 'promotion'
    else 'demotion'
  end;

  insert into public.warga_membership_history(
    user_id, previous_role, new_role, completed_orders, event_type
  ) values (new.id, v_old_role, v_new_role, v_completed, v_event);

  return new;
end;
$function$;

revoke all on function private.capture_warga_membership_history() from public, anon, authenticated;

drop trigger if exists trg_capture_warga_membership_history on public.profiles;
create trigger trg_capture_warga_membership_history
after insert or update of role on public.profiles
for each row execute function private.capture_warga_membership_history();

-- Existing accounts get a clearly-labelled starting snapshot, not an invented join/promotion date.
insert into public.warga_membership_history(
  user_id, previous_role, new_role, completed_orders, event_type, changed_at
)
select
  p.id,
  null,
  lower(trim(p.role)),
  (
    select count(*)::integer
    from auth.users u
    join public.joki_progress j
      on lower(trim(coalesce(j.client_email,''))) = lower(trim(coalesce(u.email,'')))
    where u.id = p.id
      and lower(trim(coalesce(j.status,''))) = 'selesai'
  ),
  'baseline',
  now()
from public.profiles p
where lower(trim(coalesce(p.role,''))) in ('warga biasa','warga tidak biasa','warga sultan')
on conflict (user_id) where event_type = 'baseline' do nothing;

create or replace function public.get_my_warga_membership_history()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_role text;
  v_status text;
  v_completed integer := 0;
  v_next_role text;
  v_remaining integer := 0;
  v_progress integer := 100;
  v_history jsonb := '[]'::jsonb;
begin
  if v_user_id is null or coalesce(auth.jwt()->>'is_anonymous','false') = 'true' then
    raise exception 'Login diperlukan untuk melihat Membership History.';
  end if;

  select lower(trim(p.role)), lower(trim(p.account_status)), lower(trim(u.email))
    into v_role, v_status, v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = v_user_id;

  if v_role = 'admin' then
    raise exception 'Akun ADMIN tidak mengikuti Membership Warga.';
  end if;
  if v_role not in ('warga biasa','warga tidak biasa','warga sultan')
     or v_status is distinct from 'active' or v_email is null then
    raise exception 'Membership History hanya tersedia untuk akun Warga aktif.';
  end if;

  select count(*)::integer into v_completed
  from public.joki_progress j
  where lower(trim(coalesce(j.client_email,''))) = v_email
    and lower(trim(coalesce(j.status,''))) = 'selesai';

  if v_role = 'warga biasa' then
    v_next_role := 'warga tidak biasa';
    v_remaining := greatest(0, 7 - v_completed);
    v_progress := least(100, floor((v_completed::numeric / 7) * 100)::integer);
  elsif v_role = 'warga tidak biasa' then
    v_next_role := 'warga sultan';
    v_remaining := greatest(0, 19 - v_completed);
    v_progress := least(100, floor((greatest(0, v_completed - 7)::numeric / 12) * 100)::integer);
  else
    v_next_role := null;
    v_remaining := 0;
    v_progress := 100;
  end if;

  select coalesce(jsonb_agg(to_jsonb(h) order by h.changed_at desc, h.id desc), '[]'::jsonb)
    into v_history
  from (
    select id, previous_role, new_role, completed_orders, event_type, changed_at
    from public.warga_membership_history
    where user_id = v_user_id
    order by changed_at desc, id desc
    limit 100
  ) h;

  return jsonb_build_object(
    'role', v_role,
    'completed_orders', v_completed,
    'next_role', v_next_role,
    'orders_to_next', v_remaining,
    'progress_percent', v_progress,
    'history', v_history
  );
end;
$function$;

revoke all on function public.get_my_warga_membership_history() from public, anon;
grant execute on function public.get_my_warga_membership_history() to authenticated;

commit;
