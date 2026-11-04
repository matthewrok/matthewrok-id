-- Performance indexes for member order lookup, Inbox delivery, and admin-created records.
-- Safe to run repeatedly.
create index if not exists idx_inbox_messages_recipient_id on public.inbox_messages(recipient_id);
create index if not exists idx_inbox_messages_sender_id on public.inbox_messages(sender_id);
create index if not exists idx_profile_role_audit_actor_user_id on public.profile_role_audit(actor_user_id);
create index if not exists idx_site_notifications_created_by on public.site_notifications(created_by);
create index if not exists idx_vouchers_created_by on public.vouchers(created_by);
create index if not exists idx_joki_progress_client_email_lower_created_at on public.joki_progress (lower(client_email), created_at desc) where order_number is not null;
create index if not exists idx_inbox_recipients_user_read on public.inbox_recipients(user_id, read_at);
