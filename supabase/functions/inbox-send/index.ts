import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://matthewrok.my.id",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  let anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (publishableKeys) {
    try { anonKey = JSON.parse(publishableKeys).default || anonKey; } catch { /* legacy fallback */ }
  }
  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error("Inbox send function is missing Supabase environment configuration.");
    return json({ error: "Layanan Inbox belum dikonfigurasi." }, 503);
  }

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Silakan login terlebih dahulu." }, 401);

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  if (!userResponse.ok) return json({ error: "Sesi login tidak valid." }, 401);
  const user = await userResponse.json();
  if (!user?.id || !user?.email_confirmed_at) {
    return json({ error: "Akun harus memiliki email terverifikasi." }, 403);
  }

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return json({ error: "Format permintaan tidak valid." }, 400); }
  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();
  const audience = String(input.audience ?? "");
  const recipientId = input.recipient_id ? String(input.recipient_id) : null;
  if (title.length < 3 || title.length > 120 || body.length < 1 || body.length > 4000 ||
      !["all", "user"].includes(audience) || (audience === "user" && !recipientId)) {
    return json({ error: "Periksa kembali judul, isi pesan, dan penerima." }, 400);
  }

  const serviceHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role&limit=1`,
    { headers: serviceHeaders }
  );
  const profiles = await profileResponse.json();
  if (!profileResponse.ok || !profiles?.[0]) return json({ error: "Profil akun tidak ditemukan." }, 403);
  if (profiles[0].role !== "admin") {
    return json({ error: "Kamu tidak memiliki izin mengirim pesan Inbox." }, 403);
  }

  const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/service_send_inbox_message`, {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({
      p_sender_id: user.id,
      p_title: title,
      p_body: body,
      p_audience: audience,
      p_recipient_id: audience === "user" ? recipientId : null,
    }),
  });
  const result = await rpcResponse.json();
  if (!rpcResponse.ok) {
    console.error("Inbox message RPC failed", rpcResponse.status, result);
    return json({ error: "Pesan gagal disimpan. Periksa penerima dan coba kembali." }, 502);
  }
  return json({ ok: true, message_id: result });
});
