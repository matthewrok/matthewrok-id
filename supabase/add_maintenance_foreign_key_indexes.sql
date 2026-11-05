-- Maintenance Mode 2.0 — cover foreign-key lookup paths reported by Performance Advisor.
-- Safe additive indexes; no row data or access policy is changed.
-- Review and apply as a forward migration only after the PR/release review.

begin;

create index if not exists site_maintenance_audit_actor_id_idx
  on public.site_maintenance_audit(actor_id);

create index if not exists site_maintenance_config_updated_by_idx
  on public.site_maintenance_config(updated_by);

commit;
