# Maintenance Mode 2.0 — MATTHEW JOKI

## Status
Implemented in PR #13 and the server-side configuration has been applied to the live Supabase project. The default production state is **disabled**. The feature is not activated unless an admin explicitly turns it on.

## Supported modes

### 1. FULL MAINTENANCE
- Non-admin visitors and members are routed to maintenance.html.
- Admins verified by the server-side is_admin RPC can access the admin dashboard and disable maintenance.
- Order creation is denied by the database RPC.
- Worker applications are denied by the worker-application-submit Edge Function.
- Inbox message reads are denied by RLS for non-admin users.
- Login and password-reset routes remain available so an admin can recover access.

### 2. ORDER MAINTENANCE
- The website remains browseable.
- Checkout entry points show a maintenance message and are disabled.
- The legacy and secure order RPC paths both enforce the maintenance state in PostgreSQL.
- Voucher lookup remains read-only; voucher redemption cannot complete because order creation is blocked.
- Existing order history remains readable.

### 3. SYSTEM MAINTENANCE
Selectable modules:
- orders — checkout and voucher redemption are blocked by the database.
- worker — all worker applications are blocked by the Edge Function.
- macul — only MACUL worker applications are blocked; AKUN applications remain available.
- inbox — member Inbox reads and read-receipt updates are blocked by RLS; admin access remains available.

If the maintenance configuration cannot be read, order creation and worker submissions fail closed.

## Admin controls
- Admin Dashboard → Status Website & Maintenance Mode.
- Enable/disable toggle, mode selection, custom message, estimated completion time, and affected modules.
- Emergency restore button disables maintenance immediately.
- Every change writes an append-only audit entry with actor, previous state, new state, and timestamp.
- All mutations are verified against an active admin profile in PostgreSQL; browser metadata/localStorage are not trusted.

## Telegram admin controls
- Telegram admin panel source in this PR includes Maintenance Mode.
- /maintenance opens the controls after the PR branch's Telegram Edge Function is deployed.
- Inline actions can disable maintenance or enable FULL, ORDER, or a selected SYSTEM module.
- Telegram webhook validates the configured secret token and requires both chat ID and sender ID to match TELEGRAM_CHAT_ID.
- The webhook uses a service_role-only RPC that also validates an active admin profile and records the audit entry.
- service_role has SELECT only on the canonical config table so Edge Functions can read it; anon/authenticated have no direct table access.
- Telegram bot token and service-role key remain server-side; no secret is stored in browser code or repository.

## Backend implementation
- Canonical configuration: public.site_maintenance_config (singleton).
- Append-only history: public.site_maintenance_audit.
- Public read-only RPC: get_public_maintenance_status.
- Authenticated admin RPCs: admin_set_maintenance and admin_get_maintenance_audit.
- Server-to-server Telegram RPC: service_set_maintenance, executable only by service_role.
- Internal policy helper: is_maintenance_module_blocked.
- Order enforcement: create_joki_order checks maintenance in PostgreSQL; create_joki_order_secure calls that guarded function.
- Worker enforcement: worker-application-submit queries the canonical config using service_role and returns 503 if status cannot be verified.
- Inbox enforcement: RLS policies block non-admin reads/receipt updates while Inbox maintenance is active.

## Deployment and verification
- Supabase migration maintenance_mode_v2_server_enforcement applied; default config row is enabled=false.
- Supabase migration maintenance_mode_inbox_rls applied.
- Supabase migration maintenance_mode_telegram_rpc applied.
- Edge Function worker-application-submit deployed as version 5 with verify_jwt=true.
- Production telegram-order-notify is currently version 42 (previous menu only, verify_jwt=false). The maintenance callback source is staged in this PR and must be deployed after the frontend is published, so the live bot cannot activate maintenance before the UI gate exists.
- SQL syntax was tested inside rollback transactions before applying migrations.
- Rollback-only role simulation verified that a member cannot read Inbox messages/receipts during Inbox maintenance while admin can still read them.
- A rollback-only service_role test verified the Telegram maintenance RPC without persisting a config change or audit row.
- Production maintenance state remains disabled; audit table has no test entries.

## Recovery and rollback
- Admin Dashboard and Telegram /maintenance both provide an emergency disable path.
- The public maintenance page links to login so an admin can authenticate and regain access.
- Do not drop the maintenance tables/functions after the frontend is published. To disable maintenance, use the admin toggle or Telegram command, not a schema rollback.
- Before future destructive changes, take a Supabase Dashboard backup/PITR restore point. Connected tools in this session did not expose a native backup/export action or staging branch.

## Remaining manual QA
- Browser/device smoke tests with a real admin session.
- Confirm the admin can enable/disable FULL mode and reach the dashboard while it is active.
- Confirm member/visitor redirects, checkout denial, worker/MACUL module behavior, Inbox RLS denial, and Telegram buttons against a real Telegram update.
- Do not activate maintenance in production for testing; use a separate staging project when available.