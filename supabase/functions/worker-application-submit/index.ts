import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const esc = (value: unknown) => String(value ?? "-")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  const adminChatId = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey || !botToken || !adminChatId) {
    console.error("Worker application function is missing required environment configuration.");
    return json({ error: "Layanan pendaftaran belum dikonfigurasi sepenuhnya." }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Silakan login terlebih dahulu." }, 401);

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authHeader },
  });
  if (!userResponse.ok) return json({ error: "Sesi login tidak valid. Silakan login kembali." }, 401);
  const user = await userResponse.json();
  if (!user?.id || !user?.email || !user?.email_confirmed_at) {
    return json({ error: "Email harus diverifikasi sebelum mengirim pendaftaran." }, 403);
  }

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return json({ error: "Format permintaan tidak valid." }, 400); }

  const applicantName = String(input.applicant_name ?? "").trim().replace(/\s+/g, " ");
  const workerType = String(input.worker_type ?? "");
  const playDuration = String(input.play_duration ?? "").trim();
  const accountCapacity = String(input.account_capacity ?? "").trim();
  const whatsapp = String(input.whatsapp_number ?? "").trim();
  const consent = input.consent === true;

  if (applicantName.length < 2 || applicantName.length > 80 ||
      !["akun", "macul"].includes(workerType) ||
      playDuration.length < 1 || playDuration.length > 120 ||
      accountCapacity.length < 1 || accountCapacity.length > 120 ||
      whatsapp.length > 40 || !consent) {
    return json({ error: "Periksa kembali formulir. Persetujuan wajib dicentang." }, 400);
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/worker_applications`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      applicant_id: user.id,
      applicant_name: applicantName,
      applicant_email: user.email,
      worker_type: workerType,
      play_duration: playDuration,
      account_capacity: accountCapacity,
      whatsapp_number: whatsapp || null,
      status: "pending",
    }),
  });

  const inserted = await insertResponse.json();
  if (!insertResponse.ok || !Array.isArray(inserted) || !inserted[0]?.id) {
    console.error("Worker application insert failed", insertResponse.status, inserted);
    return json({ error: "Pendaftaran gagal disimpan. Silakan coba kembali." }, 502);
  }

  const application = inserted[0];
  const kind = workerType === "akun" ? "Worker AKUN" : "Worker MACUL";
  const telegramText = [
    "🧾 <b>PENDAFTARAN WORKER BARU — MATTHEW</b>", "",
    `👤 <b>Nama:</b> ${esc(applicantName)}`,
    `📧 <b>Email:</b> ${esc(user.email)}`,
    `🧩 <b>Jenis:</b> ${kind}`,
    `🎮 <b>Lama bermain RoK:</b> ${esc(playDuration)}`,
    `📦 <b>Kapasitas akun:</b> ${esc(accountCapacity)}`,
    `📱 <b>WhatsApp:</b> ${esc(whatsapp || "Tidak dicantumkan")}`,
    `🆔 <b>ID:</b> <code>${esc(application.id)}</code>`, "",
    "Pilih keputusan. Status hanya dapat diproses satu kali.",
  ].join("\n");

  const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: adminChatId,
      text: telegramText,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ APPROVE", callback_data: `wa|a|${application.id}` },
          { text: "❌ REJECT", callback_data: `wa|r|${application.id}` },
        ]],
      },
    }),
  });

  const telegramResult = await telegramResponse.json();
  if (!telegramResponse.ok || !telegramResult?.ok) {
    console.error("Worker Telegram notification failed", telegramResult);
    return json({
      ok: false,
      saved: true,
      notification_sent: false,
      application_id: application.id,
      error: "Pendaftaran tersimpan, tetapi notifikasi Telegram gagal dikirim. Admin perlu memeriksa antrean pendaftaran.",
    }, 502);
  }

  return json({ ok: true, saved: true, notification_sent: true, application_id: application.id });
});
