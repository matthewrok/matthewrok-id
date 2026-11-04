-- Immutable audit trail for status, progress, and note changes on joki_progress.
-- Applied to production Supabase as migration add_immutable_joki_order_history.

create table if not exists public.joki_order_history (
  id bigint generated always as identity primary key,
  order_id uuid not null,
  order_number text,
  client_email text,
  event_type text not null,
  old_status text,
  new_status text,
  old_progress integer,
  new_progress integer,
  old_note text,
  new_note text,
  changed_by uuid,
  actor_source text not null default 'system_or_telegram',
  changed_at timestamptz not null default now()
);
alter table public.joki_order_history enable row level security;
revoke all on public.joki_order_history from public, anon, authenticated;
grant select, insert on public.joki_order_history to service_role;

create or replace function public.capture_joki_order_history()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_event text;
begin
  if old.status is distinct from new.status
     or old.progress_percent is distinct from new.progress_percent
     or old.progress_note is distinct from new.progress_note then
    v_event := case
      when old.status is distinct from new.status and old.progress_percent is distinct from new.progress_percent then 'status_and_progress'
      when old.status is distinct from new.status then 'status'
      when old.progress_percent is distinct from new.progress_percent then 'progress'
      else 'note' end;
    insert into public.joki_order_history (
      order_id, order_number, client_email, event_type, old_status, new_status,
      old_progress, new_progress, old_note, new_note, changed_by, actor_source
    ) values (
      new.id, new.order_number, lower(new.client_email), v_event, old.status, new.status,
      old.progress_percent, new.progress_percent, old.progress_note, new.progress_note,
      (select auth.uid()),
      case when (select auth.uid()) is not null then 'website' else 'system_or_telegram' end
    );
  end if;
  return new;
end;
$$;
drop trigger if exists trg_capture_joki_order_history on public.joki_progress;
create trigger trg_capture_joki_order_history after update on public.joki_progress
for each row execute function public.capture_joki_order_history();

create or replace function public.list_my_joki_order_history()
returns table (
  id bigint, order_id uuid, order_number text, event_type text,
  old_status text, new_status text, old_progress integer, new_progress integer,
  old_note text, new_note text, actor_source text, changed_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare v_email text;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select lower(u.email) into v_email from auth.users u
  where u.id = (select auth.uid())
    and coalesce((u.raw_app_meta_data ->> 'provider'), '') <> 'anonymous';
  if v_email is null then raise exception 'Verified account email required'; end if;
  return query select h.id, h.order_id, h.order_number, h.event_type,
    h.old_status, h.new_status, h.old_progress, h.new_progress,
    h.old_note, h.new_note, h.actor_source, h.changed_at
  from public.joki_order_history h where h.client_email = v_email
  order by h.changed_at desc limit 200;
end;
$$;
revoke all on function public.list_my_joki_order_history() from public, anon;
grant execute on function public.list_my_joki_order_history() to authenticated;
revoke all on function public.capture_joki_order_history() from public, anon, authenticated;
