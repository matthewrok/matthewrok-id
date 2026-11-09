const { test, expect } = require("@playwright/test");

test("Automatic notifications migration wires order status changes to member Inbox", async ({ request }) => {
  const response = await request.get("/supabase/matthew-automatic-notifications.sql");
  expect(response.ok()).toBeTruthy();
  const sql = await response.text();

  expect(sql).toContain("private.notify_member_order_status_change()");
  expect(sql).toContain("after update of status on public.joki_progress");
  expect(sql).toContain("old.status is distinct from new.status");
  expect(sql).toContain("lower(trim(coalesce(p.email, ''))) = lower(trim(new.client_email))");
  expect(sql).toContain("insert into public.inbox_messages");
  expect(sql).toContain("insert into public.inbox_recipients");
  expect(sql).toContain("revoke all on function private.notify_member_order_status_change() from public, anon, authenticated");
});

test("Voucher expiry reminders are idempotent and scheduled hourly", async ({ request }) => {
  const response = await request.get("/supabase/matthew-automatic-notifications.sql");
  expect(response.ok()).toBeTruthy();
  const sql = await response.text();

  expect(sql).toContain("private.member_voucher_reminder_deliveries");
  expect(sql).toContain("primary key (voucher_id, user_id, reminder_type)");
  expect(sql).toContain("c.redeemed_at is null");
  expect(sql).toContain("v.expires_at <= now() + interval '24 hours'");
  expect(sql).toContain("on conflict (voucher_id, user_id, reminder_type) do nothing");
  expect(sql).toContain("private.send_member_voucher_expiry_reminders()");
  expect(sql).toContain("'15 * * * *'");
});

test("Inbox remains the member notification history with read receipts", async ({ request }) => {
  const response = await request.get("/assets/js/inbox.js");
  expect(response.ok()).toBeTruthy();
  const js = await response.text();
  expect(js).toContain('from("inbox_messages")');
  expect(js).toContain('from("inbox_recipients")');
  expect(js).toContain("read_at");
  expect(js).toContain(".limit(100)");
});
