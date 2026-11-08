Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const webhookSecret = Deno.env.get("JOKI_WEBHOOK_SECRET") ?? "";
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  const adminChatId = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!webhookSecret || !botToken || !adminChatId) {
    return Response.json({ error: "Bot secrets are not configured" }, { status: 500 });
  }

  const sendMessage = async (chatId: string | number, text: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: formatTelegramText(text), parse_mode: "HTML", disable_web_page_preview: true, ...extra }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) console.error("Telegram sendMessage failed", data);
    return data;
  };
  const answerCallback = async (id: string, text = "") => {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: id, text }),
    });
  };
  const editMessage = async (chatId: string, messageId: number, text: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: formatTelegramText(text), parse_mode: "HTML", disable_web_page_preview: true, ...extra }),
    });
    const data = await res.json();
    if (!data.ok) console.error("Telegram editMessageText failed", data);
    return data;
  };

  const esc = (v: unknown) => String(v ?? "-").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

  // Normalize every bot response so older templates cannot show literal "\\n"
  // sequences or inconsistent blank lines. Existing maintenance copy is preserved.
  const formatTelegramText = (value: string) => String(value ?? "")
    .replace(/\\r\\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const money = (v: unknown) => "Rp" + Number(v ?? 0).toLocaleString("id-ID");
  const baseHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const mainMenu = { inline_keyboard: [
    [{ text: "📦 Pesanan", callback_data: "orders" }, { text: "📊 Ringkasan", callback_data: "summary" }],
    [{ text: "👥 Lihat Role & Membership", callback_data: "roles" }],
    [{ text: "📣 Pengumuman", callback_data: "announcements" }, { text: "🎟️ Voucher", callback_data: "vouchers" }],
    [{ text: "👀 Pengunjung", callback_data: "visitors" }, { text: "⭐ Ulasan", callback_data: "reviews" }],
    [{ text: "🌐 Status Website", callback_data: "site_status" }],
    [{ text: "⚙️ Maintenance Mode", callback_data: "maintenance" }],
    [{ text: "❔ Panduan & Perintah", callback_data: "help" }],
  ] };
  const helpText = [
    "🤖 <b>PANDUAN MATTHEWBOT</b>",
    "━━━━━━━━━━━━━━━━━━",
    "",
    "Gunakan tombol panel untuk mengelola website dengan mudah.",
    "",
    "📦 <b>PERINTAH PESANAN</b>",
    "<code>/pesanan</code> — melihat 10 pesanan terbaru",
    "<code>/detail NOMOR</code> — melihat detail pesanan",
    "<code>/progress NOMOR PERSEN CATATAN</code> — memperbarui progres",
    "<code>/status NOMOR STATUS</code> — memperbarui status pesanan",
    "",
    "⚙️ <b>PERINTAH WEBSITE</b>",
    "<code>/maintenance</code> — melihat dan mengatur Maintenance Mode",
    "<code>/panel</code> — membuka kembali panel admin",
    "<code>/bantuan</code> — menampilkan panduan ini",
    "",
    "🔐 <b>KEAMANAN</b>",
    "Perubahan penting melalui tombol akan meminta konfirmasi sebelum disimpan."
  ].join("\\n");

  // Private endpoint: setup webhook and deliver database order notifications.
  if (req.headers.get("x-webhook-secret") === webhookSecret) {
    let payload: any = {};
    try { payload = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (payload.action === "setup_telegram_webhook") {
      const setup = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${supabaseUrl}/functions/v1/telegram-order-notify`,
          secret_token: webhookSecret,
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: false
        }),
      });
      const result = await setup.json();
      if (!result.ok) return Response.json({ ok: false, description: result.description ?? "Webhook setup failed" }, { status: 502 });
      const commandsRes = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands: [
          { command: "start", description: "Buka panel admin otomatis" },
          { command: "panel", description: "Tampilkan panel admin" },
          { command: "pesanan", description: "Lihat 10 pesanan terbaru" },
          { command: "detail", description: "Lihat detail pesanan berdasarkan nomor" },
          { command: "progress", description: "Ubah progress pesanan" },
          { command: "status", description: "Ubah status pesanan" },
          { command: "maintenance", description: "Kelola mode maintenance website" },
          { command: "bantuan", description: "Lihat panduan perintah bot" }
        ] })
      });
      const commandsResult = await commandsRes.json();
      return Response.json({
        ok: Boolean(commandsResult.ok),
        webhook: result.description ?? "Webhook set",
        commands: commandsResult.ok ? "Bot commands registered" : (commandsResult.description ?? "Command registration failed")
      }, { status: commandsResult.ok ? 200 : 502 });
    }
    if (payload.action === "order_updated") {
      const record = payload.record ?? {};
      const previous = payload.old_record ?? {};
      if (!record.order_number) return Response.json({ ok: true, skipped: "tracking-only record" });
      const changes: string[] = [];
      if (previous.status !== record.status) changes.push(`📌 <b>Status:</b> ${esc(previous.status)} → <b>${esc(record.status)}</b>`);
      if (previous.progress_percent !== record.progress_percent) changes.push(`📊 <b>Progres:</b> ${esc(previous.progress_percent ?? 0)}% → <b>${esc(record.progress_percent ?? 0)}%</b>`);
      if (previous.progress_note !== record.progress_note) changes.push(`📝 <b>Catatan:</b> ${esc(record.progress_note || "—")}`);
      if (!changes.length) return Response.json({ ok: true, skipped: "no tracked changes" });
      const message = [
        "🔄 <b>PEMBARUAN PESANAN — MATTHEW JOKI</b>", "",
        `🧾 <b>No. Pesanan:</b> <code>${esc(record.order_number)}</code>`,
        `👤 <b>Nama:</b> ${esc(record.client_name)}`,
        `🏰 <b>Kingdom:</b> ${esc(record.kingdom_number || "—")}`,
        ...changes, "",
        `🕒 <b>Diperbarui:</b> ${esc(record.updated_at || new Date().toISOString())}`,
      ].join("\\n");
      const sent = await sendMessage(adminChatId, message, { reply_markup: mainMenu });
      return Response.json({ ok: Boolean(sent.ok) }, { status: sent.ok ? 200 : 502 });
    }
    const record = payload?.record ?? payload?.data?.record ?? payload;
    if (!record || typeof record !== "object" || !record.order_number) return Response.json({ error: "Missing order record" }, { status: 400 });
    const message = [
      "🔔 <b>PESANAN BARU — MATTHEW JOKI</b>", "",
      `🧾 <b>No. Pesanan:</b> <code>${esc(record.order_number)}</code>`,
      `👤 <b>Nama:</b> ${esc(record.client_name)}`,
      `🏰 <b>Kingdom:</b> ${esc(record.kingdom_number || "—")}`,
      `📧 <b>Email:</b> ${esc(record.client_email || "Visitor")}`,
      `🎮 <b>Paket:</b> ${esc(record.service_name)}`,
      `📦 <b>Jumlah karakter:</b> ${esc(record.quantity)}`,
      `🎟️ <b>Kode voucher:</b> ${esc(record.voucher_code || "Tidak digunakan")}`,
      `💵 <b>Subtotal:</b> ${money(record.subtotal_price ?? (Number(record.unit_price || 0) * Number(record.quantity || 0)))}`,
      `🏷️ <b>Diskon:</b> ${money(record.discount_amount)}`,
      `💰 <b>Total:</b> ${money(record.total_price)}`,
      `📌 <b>Status:</b> ${esc(record.status || "Menunggu")}`,
      "", "Pesanan baru telah tersimpan di sistem website."
    ].join("\n");
    const sent = await sendMessage(adminChatId, message, { reply_markup: mainMenu });
    return Response.json({ ok: Boolean(sent.ok) }, { status: sent.ok ? 200 : 502 });
  }

  if (req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let update: any;
  try { update = await req.json(); } catch { return Response.json({ ok: true }); }

  const chatId = String(update?.message?.chat?.id ?? update?.callback_query?.message?.chat?.id ?? "");
  const senderId = String(update?.message?.from?.id ?? update?.callback_query?.from?.id ?? "");
  if (chatId !== adminChatId || senderId !== adminChatId) return Response.json({ ok: true });
  if (!supabaseUrl || !serviceKey) {
    if (update?.message) await sendMessage(chatId, "⚠️ Koneksi database belum tersedia.");
    return Response.json({ ok: true });
  }

  const queryOrder = async (orderNumber: string) => {
    const url = `${supabaseUrl}/rest/v1/joki_progress?order_number=eq.${encodeURIComponent(orderNumber)}&select=id,order_number,client_name,client_email,service_name,kingdom_number,quantity,unit_price,subtotal_price,voucher_code,discount_amount,total_price,status,progress_percent,progress_note,created_at,updated_at&limit=1`;
    const res = await fetch(url, { headers: baseHeaders });
    const rows = await res.json();
    if (!res.ok) { console.error("Order lookup failed", res.status, rows); throw new Error("Database read failed"); }
    return rows?.[0] ?? null;
  };
  const formatOrder = (o: any) => [
    "📋 <b>DETAIL PESANAN</b>", "",
    `🧾 <b>Nomor:</b> <code>${esc(o.order_number)}</code>`,
    `👤 <b>Nama:</b> ${esc(o.client_name)}`,
    `🏰 <b>Kingdom:</b> ${esc(o.kingdom_number || "—")}`,
    `📧 <b>Email:</b> ${esc(o.client_email || "Visitor")}`,
    `🎮 <b>Paket:</b> ${esc(o.service_name)}`,
    `📦 <b>Jumlah karakter:</b> ${esc(o.quantity)}`,
    `🎟️ <b>Voucher:</b> ${esc(o.voucher_code || "Tidak digunakan")}`,
    `💵 <b>Subtotal:</b> ${money(o.subtotal_price ?? (Number(o.unit_price || 0) * Number(o.quantity || 0)))}`,
    `🏷️ <b>Diskon:</b> ${money(o.discount_amount)}`,
    `💰 <b>Total:</b> ${money(o.total_price)}`,
    `📌 <b>Status:</b> ${esc(o.status)}`,
    `📊 <b>Progress:</b> ${esc(o.progress_percent)}%`,
    `📝 <b>Catatan:</b> ${esc(o.progress_note || "-")}`
  ].join("\n");
  const orderKeyboard = (number: string) => ({ inline_keyboard: [
    [{ text: "👁️ Detail", callback_data: `detail|${number}` }],
    [{ text: "📊 Ubah Progress", callback_data: `progress|${number}` }, { text: "🔄 Ubah Status", callback_data: `status|${number}` }],
    [{ text: "⬅️ Menu Utama", callback_data: "menu" }]
  ] });
  const showOrders = async (targetChat: string, messageId?: number) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/joki_progress?select=order_number,client_name,service_name,kingdom_number,status,progress_percent,total_price,created_at&order=created_at.desc&limit=10`, { headers: baseHeaders });
    const rows = await res.json();
    if (!res.ok) { console.error("Order list failed", res.status, rows); throw new Error("Database read failed"); }
    if (!rows.length) {
      const t = "Belum ada pesanan.";
      if (messageId) await editMessage(targetChat, messageId, t, { reply_markup: mainMenu });
      else await sendMessage(targetChat, t, { reply_markup: mainMenu });
      return;
    }
    const body = rows.map((o: any, i: number) =>
      `${i + 1}. <code>${esc(o.order_number || "Tanpa nomor")}</code>\n   ${esc(o.client_name)} — ${esc(o.service_name)}\n   ${esc(o.status)} • ${esc(o.progress_percent)}% • ${money(o.total_price)}`
    ).join("\n\n");
    const keyboard = rows.filter((o: any) => o.order_number).map((o: any) => [{ text: `⚙️ ${String(o.order_number).slice(-8)} — ${String(o.client_name || "Pesanan").slice(0, 18)}`, callback_data: `open|${o.order_number}` }]);
    keyboard.push([{ text: "🏠 Menu Utama", callback_data: "menu" }]);
    const text = "📦 <b>10 PESANAN TERBARU</b>\n\n" + body + "\n\nPilih pesanan untuk mengelolanya:";
    if (messageId) await editMessage(targetChat, messageId, text, { reply_markup: { inline_keyboard: keyboard } });
    else await sendMessage(targetChat, text, { reply_markup: { inline_keyboard: keyboard } });
  };
  const updateOrder = async (number: string, changes: Record<string, unknown>) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/joki_progress?order_number=eq.${encodeURIComponent(number)}`, {
      method: "PATCH", headers: { ...baseHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ ...changes, updated_at: new Date().toISOString() })
    });
    const rows = await res.json();
    if (!res.ok) { console.error("Order update failed", res.status, rows); const detail = String(rows?.message || rows?.details || rows?.hint || rows?.code || "Periksa izin database dan nilai status yang diizinkan."); throw new Error("Database update failed (" + res.status + "): " + detail.slice(0, 220)); }
    if (!rows?.length) throw new Error("No order updated");
  };

  const adminRead = async (table: string, query: string) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, { headers: baseHeaders });
    const rows = await res.json();
    if (!res.ok) { console.error("Admin read failed", table, res.status, rows); throw new Error("Database read failed"); }
    return rows;
  };

  const getMaintenanceState = async () => {
    const rows = await adminRead("site_maintenance_config", "id=eq.true&select=enabled,mode,message,estimated_end_at,affected_modules,updated_at&limit=1");
    if (!rows?.[0]) throw new Error("Maintenance config unavailable");
    return rows[0];
  };
  const maintenanceKeyboard = { inline_keyboard: [
    [{ text: "🟢 Nonaktifkan", callback_data: "maint|off" }, { text: "🔴 FULL", callback_data: "maint|full" }],
    [{ text: "📦 ORDER", callback_data: "maint|orders" }],
    [{ text: "⚙️ Worker", callback_data: "maint|system|worker" }, { text: "🌾 MACUL", callback_data: "maint|system|macul" }],
    [{ text: "✉️ Inbox", callback_data: "maint|system|inbox" }, { text: "🛒 Order (System)", callback_data: "maint|system|orders" }],
    [{ text: "⬅️ Menu Utama", callback_data: "menu" }]
  ] };
  const maintenanceText = (m: any) => {
    const active = Boolean(m.enabled);
    const mode = String(m.mode || "full").toLowerCase();
    const moduleNames: Record<string, string> = {
      orders: "Pesanan / Order",
      worker: "Worker",
      macul: "MACUL",
      inbox: "Inbox"
    };
    const modules = Array.isArray(m.affected_modules)
      ? m.affected_modules.map((item: string) => moduleNames[item] || item).join(", ")
      : "";
    const modeLabel = mode === "full" ? "FULL — seluruh website" :
      mode === "orders" ? "ORDER — layanan pesanan" :
      mode === "system" ? "SYSTEM — modul tertentu" : mode.toUpperCase();
    const eta = m.estimated_end_at
      ? new Date(m.estimated_end_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB"
      : "Belum ditentukan";
    const condition = active
      ? "🔴 <b>SEDANG MAINTENANCE</b>"
      : "🟢 <b>NORMAL — WEBSITE BEROPERASI</b>";
    const affected = active
      ? (mode === "full" ? "Seluruh halaman dan layanan" : mode === "orders" ? "Fitur pemesanan" : (modules || "Modul belum ditentukan"))
      : "Tidak ada — seluruh modul dibuka";
    return [
      "⚙️ <b>PUSAT KONTROL MAINTENANCE</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "🖥️ <b>KONDISI WEBSITE</b>",
      condition,
      "",
      "🛠️ <b>PENGATURAN MAINTENANCE</b>",
      "• Status: <b>" + (active ? "AKTIF" : "NONAKTIF") + "</b>",
      "• Mode: <b>" + esc(modeLabel) + "</b>",
      "• Area terdampak: " + esc(affected),
      "",
      "📝 <b>PESAN UNTUK PENGUNJUNG</b>",
      esc(m.message || "—"),
      "",
      "⏱️ <b>ESTIMASI SELESAI</b>",
      esc(eta),
      "",
      "━━━━━━━━━━━━━━━━━━",
      "Pilih tindakan di bawah untuk mengubah status.",
      "Setiap perubahan akan tercatat di audit log.",
      "",
      "<i>Catatan: kondisi di atas mengikuti pengaturan Maintenance Mode, bukan pemeriksaan ping server secara langsung.</i>"
    ].join("\n");
  };
  const setMaintenanceFromTelegram = async (mode: string, module = "") => {
    const current = await getMaintenanceState();
    const admins = await adminRead("profiles", "role=eq.admin&select=id&limit=1");
    const actorId = admins?.[0]?.id;
    if (!actorId) throw new Error("Admin profile missing");
    const enabled = mode !== "off";
    const targetMode = mode === "off" ? "full" : mode;
    const modules = targetMode === "system" ? [module] : targetMode === "orders" ? ["orders"] : [];
    if (targetMode === "system" && !module) throw new Error("Pilih modul system maintenance");
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/service_set_maintenance`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({
        p_actor_id: actorId,
        p_enabled: enabled,
        p_mode: targetMode,
        p_message: current.message || "Website sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.",
        p_estimated_end_at: null,
        p_affected_modules: modules
      })
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Telegram maintenance update failed", response.status, result);
      throw new Error(result?.message || "Maintenance update failed");
    }
    return result;
  };
  const mutate = async (table: string, id: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method, headers: { ...baseHeaders, Prefer: "return=representation" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const rows = method === "DELETE" ? [] : await res.json();
    if (!res.ok) { console.error("Admin mutation failed", table, method, res.status, rows); throw new Error("Database change failed"); }
    if (method !== "DELETE" && !rows?.length) throw new Error("Record not found or not changed");
    return rows;
  };
  const promptEdit = async (targetChat: string, messageId: number, instruction: string, state: string) => {
    await sendMessage(targetChat, instruction, { reply_markup: { force_reply: true, selective: true }, reply_to_message_id: messageId });
  };
  const panelKeyboard = async (kind: string) => {
    if (kind === "announcements") {
      const rows = await adminRead("site_notifications", "select=id,title,is_active&order=created_at.desc&limit=10");
      return { inline_keyboard: [...rows.map((x:any) => [
        { text: (x.is_active ? "🟢 " : "⚪ ") + String(x.title).slice(0,24), callback_data: "ann|"+x.id },
        { text: "✏️", callback_data: "editann|"+x.id },
        { text: "🗑️", callback_data: "delann|"+x.id }
      ]), [{ text: "➕ Buat pengumuman", callback_data: "newann" }], [{ text: "⬅️ Menu", callback_data: "menu" }]] };
    }
    if (kind === "vouchers") {
      const rows = await adminRead("vouchers", "select=id,code,is_active&order=created_at.desc&limit=10");
      return { inline_keyboard: [...rows.map((x:any) => [
        { text: (x.is_active ? "🟢 " : "⚪ ") + String(x.code).slice(0,22), callback_data: "voucher|"+x.id },
        { text: "✏️", callback_data: "editvoucher|"+x.id },
        { text: "🗑️", callback_data: "delvoucher|"+x.id }
      ]), [{ text: "➕ Buat voucher", callback_data: "newvoucher" }], [{ text: "⬅️ Menu", callback_data: "menu" }]] };
    }
    if (kind === "roles") {
      const rows = await adminRead("profiles", "select=email,full_name,role&order=created_at.desc&limit=15");
      return { inline_keyboard: [[{ text: "👥 " + rows.length + " akun · Role otomatis", callback_data: "menu" }], [{ text: "⬅️ Menu", callback_data: "menu" }]] };
    }
    if (kind === "reviews") {
      const rows = await adminRead("joki_reviews", "select=id,client_name,rating&order=created_at.desc&limit=10");
      return { inline_keyboard: [...rows.map((x:any) => [{ text: "🗑️ Hapus ulasan "+String(x.client_name || "Pelanggan").slice(0,18)+" ("+x.rating+"/5)", callback_data: "delreview|"+x.id }]), [{ text: "⬅️ Menu", callback_data: "menu" }]] };
    }
    return mainMenu;
  };
  const summaryText = async () => {
    const results = await Promise.all([
      adminRead("joki_progress", "select=id&limit=1000"),
      adminRead("profiles", "select=id&limit=1000"),
      adminRead("visitor_logs", "select=id&limit=1000"),
      adminRead("joki_reviews", "select=id&limit=1000")
    ]);
    return [
      "📊 <b>RINGKASAN WEBSITE</b>",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "📦 <b>Total Pesanan</b>\\n" + results[0].length + " pesanan tercatat",
      "",
      "👥 <b>Total Akun</b>\\n" + results[1].length + " akun terdaftar",
      "",
      "👀 <b>Total Kunjungan</b>\\n" + results[2].length + " kunjungan tercatat",
      "",
      "⭐ <b>Total Ulasan</b>\\n" + results[3].length + " ulasan pelanggan",
      "",
      "<i>Data dihitung dari catatan yang tersedia di database.</i>"
    ].join("\\n");
  };
  const readPanel = async (kind: string) => {
    if (kind === "summary") return summaryText();
    if (kind === "roles") {
      const rows = await adminRead("profiles", "select=email,full_name,role,account_status&order=created_at.desc&limit=15");
      const body = rows.map((p: any, index: number) => [
        `${index + 1}. <b>${esc(p.full_name || "Tanpa nama")}</b>`,
        `   ✉️ ${esc(p.email || "Email tidak tersedia")}`,
        `   🏷️ Role: <b>${esc(p.role || "Belum ditentukan")}</b>`,
        `   🔘 Akun: ${esc(p.account_status || "Status tidak tersedia")}`
      ].join("\\n")).join("\\n\\n");
      return ["👥 <b>DAFTAR ROLE AKUN</b>", "━━━━━━━━━━━━━━━━━━", "", body || "Belum ada akun yang tercatat.", "", "Role member berubah otomatis berdasarkan pesanan selesai. Perubahan manual dinonaktifkan."].join("\\n");
    }
    if (kind === "announcements") {
      const rows = await adminRead("site_notifications", "select=title,is_active,audience,expires_at&order=created_at.desc&limit=10");
      const body = rows.map((n: any, index: number) => [
        `${index + 1}. <b>${esc(n.title || "Tanpa judul")}</b>`,
        `   👥 Target: ${esc(n.audience || "all")}`,
        `   🔘 Status: ${n.is_active ? "🟢 Aktif" : "⚪ Nonaktif"}`,
        `   ⏳ Berakhir: ${n.expires_at ? esc(new Date(n.expires_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })) + " WIB" : "Tidak ditentukan"}`
      ].join("\\n")).join("\\n\\n");
      return ["📣 <b>DAFTAR PENGUMUMAN TERBARU</b>", "━━━━━━━━━━━━━━━━━━", "", body || "Belum ada pengumuman.", "", "Pilih pengumuman di bawah untuk melihat detail, mengedit, mengaktifkan, atau menghapusnya."].join("\\n");
    }
    if (kind === "vouchers") {
      const rows = await adminRead("vouchers", "select=code,description,discount_type,discount_value,is_active&order=created_at.desc&limit=10");
      const body = rows.map((v: any, index: number) => {
        const discount = v.discount_type === "percent"
          ? Number(v.discount_value || 0).toLocaleString("id-ID") + "%"
          : money(v.discount_value);
        return [
          `${index + 1}. <b>${esc(v.code)}</b>`,
          `   🏷️ Diskon: <b>${esc(discount)}</b>`,
          `   📝 ${esc(v.description || "Tanpa keterangan")}`,
          `   🔘 Status: ${v.is_active ? "🟢 Aktif" : "🔴 Nonaktif"}`
        ].join("\\n");
      }).join("\\n\\n");
      return ["🎟️ <b>VOUCHER TERBARU</b>", "", body || "Belum ada voucher."].join("\\n");
    }
    if (kind === "visitors") {
      const rows = await adminRead("visitor_logs", "select=visitor_name,visited_at&order=visited_at.desc&limit=10");
      const body = rows.map((v: any, index: number) => [
        `${index + 1}. <b>${esc(v.visitor_name || "Pengunjung")}</b>`,
        `   🕒 ${v.visited_at ? esc(new Date(v.visited_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })) + " WIB" : "Waktu tidak tersedia"}`
      ].join("\\n")).join("\\n\\n");
      return ["👀 <b>RIWAYAT KUNJUNGAN TERBARU</b>", "━━━━━━━━━━━━━━━━━━", "", body || "Belum ada kunjungan yang tercatat."].join("\\n");
    }
    if (kind === "reviews") {
      const rows = await adminRead("joki_reviews", "select=client_name,rating,review_text,created_at&order=created_at.desc&limit=10");
      const body = rows.map((v: any, index: number) => [
        `${index + 1}. <b>${esc(v.client_name || "Pelanggan")}</b> — ⭐ <b>${esc(v.rating)}/5</b>`,
        `   💬 ${esc(v.review_text || "Tidak ada isi ulasan")}`,
        `   🕒 ${v.created_at ? esc(new Date(v.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })) + " WIB" : "Waktu tidak tersedia"}`
      ].join("\\n")).join("\\n\\n");
      return ["⭐ <b>ULASAN PELANGGAN TERBARU</b>", "━━━━━━━━━━━━━━━━━━", "", body || "Belum ada ulasan yang masuk.", "", "Pilih tombol ulasan di bawah jika ingin menghapus ulasan."].join("\\n");
    }
    return "Menu tidak dikenal.";
  };

  try {
    const callback = update?.callback_query;
    if (callback) {
      const data = String(callback.data ?? "");
      if (data.length > 64) { await answerCallback(callback.id, "Tombol tidak valid. Buka ulang menu."); return Response.json({ok:true}); }
      await answerCallback(callback.id);
      if (data === "maintenance") {
        const state = await getMaintenanceState();
        await editMessage(chatId, callback.message.message_id, maintenanceText(state), { reply_markup: maintenanceKeyboard });
        return Response.json({ ok: true });
      }
      if (data.startsWith("maint|")) {
        const [, action, module] = data.split("|");
        const mode = action === "system" ? "system" : action;
        const updated = await setMaintenanceFromTelegram(mode, module || "");
        await editMessage(chatId, callback.message.message_id, maintenanceText(updated), { reply_markup: maintenanceKeyboard });
        return Response.json({ ok: true });
      }
      if (data === "site_status") {
        const targetUrl = "https://matthewrok.my.id/";
        const startedAt = Date.now();
        let statusText = "";
        const keyboard = { inline_keyboard: [[{ text: "🔄 Periksa Ulang", callback_data: "site_status" }], [{ text: "⬅️ Menu Utama", callback_data: "menu" }]] };
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(targetUrl, { method: "GET", redirect: "follow", signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; MatthewJoki-Monitor/1.0)" } });
          const elapsed = Date.now() - startedAt;
          const code = response.status;
          if (code >= 200 && code < 400) {
            statusText = "🟢 <b>WEBSITE AKTIF</b>\nHalaman berhasil dijangkau.";
          } else if (code >= 500) {
            statusText = "🔴 <b>SERVER BERMASALAH</b>\nServer mengembalikan error HTTP.";
          } else if (code >= 400) {
            statusText = "🟡 <b>WEBSITE MERESPONS, ADA KENDALA</b>\nHost dapat dijangkau, tetapi halaman menolak atau tidak menemukan permintaan.";
          } else {
            statusText = "🟡 <b>RESPONS TIDAK BIASA</b>\nServer merespons dengan status yang perlu diperiksa.";
          }
          statusText += "\nHTTP: <code>" + code + "</code>";
          statusText += "\n⏱️ Waktu respons: <b>" + elapsed + " ms</b>";
          statusText += "\n🔗 " + targetUrl;
          if (response.url && response.url !== targetUrl) statusText += "\nTujuan akhir: " + esc(response.url);
        } catch (error) {
          statusText = "⚪ <b>STATUS TIDAK DAPAT DIPERIKSA</b>\nPemeriksa tidak berhasil terhubung. Ini belum tentu berarti website benar-benar down.\nDetail: <code>" + esc(error instanceof Error ? error.message : "Koneksi gagal") + "</code>\n🔗 " + targetUrl;
        } finally {
          clearTimeout(timer);
        }
        statusText = "🌐 <b>PEMERIKSAAN STATUS WEBSITE</b>\n\n" + statusText + "\n🕒 Diperiksa: <b>" + new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB</b>";
        await editMessage(chatId, callback.message.message_id, statusText, { reply_markup: keyboard });
        return Response.json({ ok: true });
      }
      if (["summary","roles","announcements","vouchers","visitors","reviews"].includes(data)) {
        const keyboard = await panelKeyboard(data);
        await editMessage(chatId, callback.message.message_id, await readPanel(data), { reply_markup: keyboard });
        return Response.json({ ok: true });
      }
      if (data.startsWith("ann|")) {
        const id = data.split("|")[1];
        const rows = await adminRead("site_notifications", "id=eq."+encodeURIComponent(id)+"&select=id,title,message,audience,is_active,expires_at&limit=1");
        const x = rows[0];
        await editMessage(chatId, callback.message.message_id, x ? "📣 <b>"+esc(x.title)+"</b>\\n"+esc(x.message)+"\\nStatus: "+(x.is_active?"Aktif":"Nonaktif") : "Pengumuman tidak ditemukan.", { reply_markup: { inline_keyboard: x ? [[{text:x.is_active?"Nonaktifkan":"Aktifkan",callback_data:"toggleann|"+id}],[{text:"✏️ Edit judul",callback_data:"editann|"+id+"|title"},{text:"✏️ Edit isi",callback_data:"editann|"+id+"|message"}],[{text:"🗑️ Hapus",callback_data:"delann|"+id}],[{text:"⬅️ Kembali",callback_data:"announcements"}]] : [[{text:"⬅️ Kembali",callback_data:"announcements"}]] } });
        return Response.json({ok:true});
      }
      if (data.startsWith("voucher|")) {
        const id=data.split("|")[1];
        const rows=await adminRead("vouchers","id=eq."+encodeURIComponent(id)+"&select=id,code,description,discount_type,discount_value,is_active&limit=1");
        const x=rows[0];
        await editMessage(chatId,callback.message.message_id,x?"🎟️ <b>"+esc(x.code)+"</b>\\n"+esc(x.description)+"\\nDiskon: "+esc(x.discount_value)+" ("+esc(x.discount_type)+")\\nStatus: "+(x.is_active?"Aktif":"Nonaktif"):"Voucher tidak ditemukan.",{reply_markup:{inline_keyboard:x?[[{text:x.is_active?"Nonaktifkan":"Aktifkan",callback_data:"togglevoucher|"+id}],[{text:"Edit kode",callback_data:"editvoucher|"+id+"|code"},{text:"Edit deskripsi",callback_data:"editvoucher|"+id+"|description"}],[{text:"Edit nilai diskon",callback_data:"editvoucher|"+id+"|discount_value"}],[{text:"🗑️ Hapus",callback_data:"delvoucher|"+id}],[{text:"⬅️ Kembali",callback_data:"vouchers"}]]:[[ {text:"⬅️ Kembali",callback_data:"vouchers"} ]] }});
        return Response.json({ok:true});
      }
      if (data === "newann") {
        await sendMessage(chatId, "NEWANN|CREATE\n📝 <b>Buat Pengumuman</b>\nBalas pesan ini dengan format:\n<code>Judul pengumuman</code>\n<code>Isi pengumuman</code>\n\nBaris pertama = judul, baris berikutnya = isi.", {reply_markup:{force_reply:true}});
        return Response.json({ok:true});
      }
      if (data === "newvoucher") {
        await sendMessage(chatId, "NEWVOUCHER|CREATE\n🎟️ <b>Buat Voucher Baru</b>\nBalas pesan ini dengan satu baris:\n<code>NAMAVOUCHER, percent/fixed, NILAI, DESKRIPSI, BATAS_PAKAI</code>\n\nContoh: <code>HEMAT10, percent, 10, Diskon pelanggan, 100</code>\n• <b>percent</b> = diskon persen (maks. 100)\n• <b>fixed</b> = potongan rupiah\n• Batas pakai boleh kosong\n• Bisa juga memakai pemisah |\n\nContoh tanpa batas: <code>MATTHEW20, percent, 20, Promo khusus,</code>", {reply_markup:{force_reply:true}});
        return Response.json({ok:true});
      }
      if (data.startsWith("editann|") || data.startsWith("editvoucher|")) {
        const [action,id,field] = data.split("|");
        const table = action==="editann" ? "site_notifications" : "vouchers";
        const col = field || (action==="editann" ? "title" : "code");
        const p = await adminRead(table,"id=eq."+encodeURIComponent(id)+"&select=id&limit=1");
        if (!p.length) await sendMessage(chatId,"Data tidak ditemukan.");
        else {
          const prompt = "EDITFIELD|"+table+"|"+id+"|"+col;
          await sendMessage(chatId,prompt+"\n✏️ Balas pesan ini dengan nilai baru untuk "+esc(col)+".",{reply_markup:{force_reply:true}});
        }
        return Response.json({ok:true});
      }
      if (data.startsWith("toggleann|") || data.startsWith("togglevoucher|")) {
        const [action,id]=data.split("|"); const table=action==="toggleann"?"site_notifications":"vouchers";
        const rows=await adminRead(table,"id=eq."+encodeURIComponent(id)+"&select=id,is_active&limit=1");
        if(!rows.length) throw new Error("Record not found");
        await mutate(table,id,"PATCH",{is_active:!rows[0].is_active});
        await editMessage(chatId,callback.message.message_id,"✅ Status berhasil diubah.",{reply_markup:{inline_keyboard:[[{text:"Kembali",callback_data:action==="toggleann"?"announcements":"vouchers"}]]}});
        return Response.json({ok:true});
      }
      if (data.startsWith("delann|") || data.startsWith("delvoucher|") || data.startsWith("delreview|")) {
        const [action,id]=data.split("|"); const table=action==="delann"?"site_notifications":action==="delvoucher"?"vouchers":"joki_reviews";
        await editMessage(chatId,callback.message.message_id,"⚠️ <b>Konfirmasi penghapusan</b>\\nData ini akan dihapus permanen. Lanjutkan?",{reply_markup:{inline_keyboard:[[{text:"Ya, hapus",callback_data:"confirmdel|"+(table==="site_notifications"?"ann":table==="vouchers"?"vch":"rev")+"|"+id},{text:"Batal",callback_data:action==="delann"?"announcements":action==="delvoucher"?"vouchers":"reviews"}]]}});
        return Response.json({ok:true});
      }
      if (data.startsWith("confirmdel|")) {
        const [,kind,id]=data.split("|");
        const table=kind==="ann"?"site_notifications":kind==="vch"?"vouchers":kind==="rev"?"joki_reviews":"";
        if(!table || !id) throw new Error("Invalid delete target");
        await mutate(table,id,"DELETE");
        await editMessage(chatId,callback.message.message_id,"✅ Data berhasil dihapus.",{reply_markup:{inline_keyboard:[[{text:"Kembali",callback_data:table==="site_notifications"?"announcements":table==="vouchers"?"vouchers":"reviews"}]]}});
        return Response.json({ok:true});
      }
      if (data.startsWith("roleuser|") || data.startsWith("askrole|") || data.startsWith("setrole|")) {
        await editMessage(chatId, callback.message.message_id, "ℹ️ Role member tidak dapat diubah manual. Sistem akan menaikkan role otomatis berdasarkan pesanan berstatus Selesai.", { reply_markup: { inline_keyboard: [[{ text: "⬅️ Kembali", callback_data: "roles" }]] } });
        return Response.json({ ok: true });
      }
      if (data === "menu" || data === "help") {
        await editMessage(chatId, callback.message.message_id, "🛠️ <b>PUSAT KONTROL — MATTHEW JOKI</b>\\n━━━━━━━━━━━━━━━━━━\\n\\n📦 <b>OPERASIONAL</b>\\nKelola pesanan dan pantau ringkasan aktivitas.\\n\\n👥 <b>PENGELOLAAN AKUN & WEBSITE</b>\\nAtur role akun, pengumuman, voucher, dan status website.\\n\\n📊 <b>AKTIVITAS & MASUKAN</b>\\nPantau kunjungan website serta ulasan pelanggan.\\n\\nPilih salah satu menu di bawah. Ketik /panel kapan saja untuk membuka panel ini kembali.", { reply_markup: mainMenu });
        return Response.json({ ok: true });
      }
      const messageId = callback.message?.message_id;
      const [action, number, value] = data.split("|");
      if (action === "wa") {
        if (!["a", "r"].includes(number) || !/^[0-9a-f-]{36}$/i.test(value || "")) {
          await editMessage(chatId, messageId, "❌ Tombol keputusan tidak valid.", { reply_markup: mainMenu });
          return Response.json({ ok: true });
        }
        const applicationRows = await adminRead(
          "worker_applications",
          "id=eq." + encodeURIComponent(value) + "&select=id,applicant_name,applicant_email,status&limit=1"
        );
        const application = applicationRows[0];
        if (!application) {
          await editMessage(chatId, messageId, "❌ Pendaftaran worker tidak ditemukan.", { reply_markup: mainMenu });
          return Response.json({ ok: true });
        }
        if (application.status !== "pending") {
          await editMessage(chatId, messageId, "ℹ️ Pendaftaran ini sudah diproses dengan status <b>" + esc(application.status) + "</b>. Keputusan tidak dapat diubah.", { reply_markup: mainMenu });
          return Response.json({ ok: true });
        }
        const actors = await adminRead("profiles", "role=eq.admin&select=id&limit=1");
        if (!actors.length) throw new Error("Akun admin untuk pencatatan keputusan tidak ditemukan.");
        const decision = number === "a" ? "approved" : "rejected";
        const rpcResponse = await fetch(supabaseUrl + "/rest/v1/rpc/process_worker_application_decision", {
          method: "POST",
          headers: { ...baseHeaders, Prefer: "return=representation" },
          body: JSON.stringify({ p_application_id: value, p_decision: decision, p_actor_id: actors[0].id })
        });
        const rpcResult = await rpcResponse.json();
        if (!rpcResponse.ok) {
          console.error("Worker decision RPC failed", rpcResponse.status, rpcResult);
          throw new Error("Keputusan gagal disimpan. Periksa fungsi database dan coba kembali.");
        }
        const resultText = decision === "approved"
          ? "✅ <b>PENDAFTARAN WORKER DISETUJUI</b>"
          : "❌ <b>PENDAFTARAN WORKER DITOLAK</b>";
        await editMessage(chatId, messageId,
          resultText + "\n\n👤 " + esc(application.applicant_name) +
          "\n📧 " + esc(application.applicant_email) +
          "\n📬 Status database berhasil diperbarui dan pesan hasil dikirim ke Inbox penerima.",
          { reply_markup: { inline_keyboard: [[{ text: "⬅️ Menu Utama", callback_data: "menu" }]] } }
        );
        return Response.json({ ok: true });
      }
      if (action === "menu") {
        await editMessage(chatId, messageId, "🛠️ <b>PANEL ADMIN — MATTHEW JOKI</b>\n\n<b>OPERASIONAL</b>\nPesanan dan ringkasan.\n\n<b>PENGELOLAAN WEBSITE</b>\nRole akun, pengumuman, dan voucher.\n\n<b>AKTIVITAS &amp; MASUKAN</b>\nPengunjung dan ulasan.\n\nPilih menu di bawah. Ketik /panel untuk membukanya lagi.", { reply_markup: mainMenu });
      } else if (action === "help") {
        await editMessage(chatId, messageId, helpText, { reply_markup: mainMenu });
      } else if (action === "search_help") {
        await editMessage(chatId, messageId, "🔍 <b>CARI PESANAN</b>\n\nKirim perintah:\n<code>/detail NOMOR_PESANAN</code>\n\nContoh: <code>/detail MJ-261103-00A90E54</code>", { reply_markup: { inline_keyboard: [[{ text: "⬅️ Menu Utama", callback_data: "menu" }]] } });
      } else if (action === "orders") {
        await showOrders(chatId, messageId);
      } else if (action === "open" || action === "detail") {
        const order = await queryOrder(number);
        if (!order) await editMessage(chatId, messageId, "❌ Pesanan tidak ditemukan.", { reply_markup: mainMenu });
        else await editMessage(chatId, messageId, formatOrder(order), { reply_markup: orderKeyboard(number) });
      } else if (action === "progress") {
        const order = await queryOrder(number);
        if (!order) await editMessage(chatId, messageId, "❌ Pesanan tidak ditemukan.", { reply_markup: mainMenu });
        else {
          const buttons = [0, 25, 50, 75, 100].map(p => ({ text: `${p}%`, callback_data: `askp|${number}|${p}` }));
          await editMessage(chatId, messageId, `📊 <b>UBAH PROGRESS</b>\n\nPesanan: <code>${esc(number)}</code>\nProgress saat ini: <b>${esc(order.progress_percent)}%</b>\n\nPilih progress baru:`, { reply_markup: { inline_keyboard: [buttons.slice(0, 3), buttons.slice(3), [{ text: "⬅️ Kembali", callback_data: `open|${number}` }]] } });
        }
      } else if (action === "askp") {
        await editMessage(chatId, messageId, `⚠️ <b>KONFIRMASI PROGRESS</b>\n\nUbah progress pesanan <code>${esc(number)}</code> menjadi <b>${esc(value)}%</b>?`, { reply_markup: { inline_keyboard: [[{ text: "✅ Ya, simpan", callback_data: `savep|${number}|${value}` }, { text: "❌ Batal", callback_data: `open|${number}` }]] } });
      } else if (action === "savep") {
        const percent = Number(value);
        if (![0, 25, 50, 75, 100].includes(percent)) throw new Error("Invalid progress value");
        await updateOrder(number, { progress_percent: percent, progress_note: `Progress diperbarui menjadi ${percent}% melalui Telegram` });
        const order = await queryOrder(number);
        await editMessage(chatId, messageId, `✅ <b>PROGRESS BERHASIL DIPERBARUI</b>\n\n${formatOrder(order)}`, { reply_markup: orderKeyboard(number) });
      } else if (action === "status") {
        const order = await queryOrder(number);
        if (!order) await editMessage(chatId, messageId, "❌ Pesanan tidak ditemukan.", { reply_markup: mainMenu });
        else {
          const statuses = [["Menunggu","🟡 Menunggu"],["Dalam pengerjaan","🔵 Dalam pengerjaan"],["Menunggu konfirmasi client","🟣 Menunggu konfirmasi client"],["Selesai","🟢 Selesai"],["Ditunda","⏸️ Ditunda"]];
          const keyboard = statuses.map(([v, label]) => [{ text: label, callback_data: `asks|${number}|${v}` }]);
          keyboard.push([{ text: "⬅️ Kembali", callback_data: `open|${number}` }]);
          await editMessage(chatId, messageId, `🔄 <b>UBAH STATUS</b>\n\nPesanan: <code>${esc(number)}</code>\nStatus saat ini: <b>${esc(order.status)}</b>\n\nPilih status baru:`, { reply_markup: { inline_keyboard: keyboard } });
        }
      } else if (action === "asks") {
        await editMessage(chatId, messageId, `⚠️ <b>KONFIRMASI STATUS</b>\n\nUbah status pesanan <code>${esc(number)}</code> menjadi <b>${esc(value)}</b>?`, { reply_markup: { inline_keyboard: [[{ text: "✅ Ya, simpan", callback_data: `saves|${number}|${value}` }, { text: "❌ Batal", callback_data: `open|${number}` }]] } });
      } else if (action === "saves") {
        if (!["Menunggu", "Dalam pengerjaan", "Menunggu konfirmasi client", "Selesai", "Ditunda"].includes(value)) throw new Error("Status tidak valid untuk database.");
        await updateOrder(number, { status: value });
        const order = await queryOrder(number);
        await editMessage(chatId, messageId, `✅ <b>STATUS BERHASIL DIPERBARUI</b>\n\n${formatOrder(order)}`, { reply_markup: orderKeyboard(number) });
      }
      return Response.json({ ok: true });
    }

    const msg = update?.message;
    if (!msg?.text) return Response.json({ ok: true });
    const text = String(msg.text).trim();
    const replyText = String(msg.reply_to_message?.text ?? "");
    if (replyText.startsWith("NEWVOUCHER|CREATE")) {
      const fields = text.includes("|") ? text.split("|").map((v:string) => v.trim()) : text.split(",").map((v:string) => v.trim());
      const code = (fields[0] || "").toUpperCase();
      const discountType = (fields[1] || "").toLowerCase();
      const discountValue = Number(fields[2]);
      const description = fields[3] || null;
      const maxUses = fields[4] ? Number(fields[4]) : null;
      if (!/^[A-Z0-9-]{4,24}$/.test(code) || !["percent","fixed"].includes(discountType) || !Number.isFinite(discountValue) || discountValue <= 0 || (discountType === "percent" && discountValue > 100) || (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0))) {
        await sendMessage(chatId, "❌ Format voucher tidak valid. Gunakan: <code>KODE, percent/fixed, NILAI, DESKRIPSI, BATAS_PAKAI</code>\nContoh: <code>HEMAT10, percent, 10, Diskon pelanggan, 100</code>\nAtau gunakan pemisah |. Nilai percent maksimal 100; fixed berarti potongan rupiah. Batas pakai boleh kosong.");
        return Response.json({ok:true});
      }
      const creators = await adminRead("profiles","role=eq.admin&select=id&limit=1");
      if (!creators.length) { await sendMessage(chatId,"❌ Profil admin tidak ditemukan. Pastikan akun admin sudah memiliki profil."); return Response.json({ok:true}); }
      const payload = {code,discount_type:discountType,discount_value:discountValue,description,max_uses:maxUses,used_count:0,starts_at:new Date().toISOString(),expires_at:null,is_active:true,created_by:creators[0].id};
      const res = await fetch(supabaseUrl + "/rest/v1/vouchers", {method:"POST",headers:{...baseHeaders,Prefer:"return=representation"},body:JSON.stringify(payload)});
      const created = await res.json();
      if (!res.ok || !created?.length) {
        console.error("Voucher creation failed",res.status,created);
        const detail = String(created?.message || created?.hint || created?.details || "Periksa izin tabel atau kode duplikat.");
        await sendMessage(chatId,"❌ Voucher gagal dibuat. " + esc(detail));
      } else {
        await sendMessage(chatId,"✅ Voucher <b>" + esc(code) + "</b> berhasil dibuat dan langsung aktif.",{reply_markup:{inline_keyboard:[[{text:"🎟️ Lihat Voucher",callback_data:"vouchers"}]]}});
      }
      return Response.json({ok:true});
    }
    if (replyText.startsWith("NEWANN|CREATE")) {
      const lines = text.split("\n");
      const title = (lines.shift() || "").trim();
      const message = lines.join("\n").trim();
      if (!title || !message || title.length > 120 || message.length > 2000) {
        await sendMessage(chatId, "Format tidak valid. Baris pertama harus judul (maks. 120 karakter), baris berikutnya isi (maks. 2.000 karakter).");
        return Response.json({ok:true});
      }
      const creators = await adminRead("profiles","role=eq.MATTHEW&select=id&limit=1");
      if (!creators.length) { await sendMessage(chatId,"Akun pembuat dengan role MATTHEW tidak ditemukan."); return Response.json({ok:true}); }
      const res = await fetch(supabaseUrl + "/rest/v1/site_notifications", {method:"POST",headers:{...baseHeaders,Prefer:"return=representation"},body:JSON.stringify({title,message,audience:"all",is_active:true,created_by:creators[0].id})});
      const created = await res.json();
      if (!res.ok || !created?.length) { console.error("Announcement creation failed",res.status,created); await sendMessage(chatId,"❌ Pengumuman gagal dibuat. Periksa izin tabel dan kolom wajib."); }
      else { await sendMessage(chatId,"✅ Pengumuman berhasil dibuat dan langsung aktif.",{reply_markup:{inline_keyboard:[[{text:"📣 Lihat Pengumuman",callback_data:"announcements"}]]}}); }
      return Response.json({ok:true});
    }
    const editMatch = replyText.match(/EDITFIELD\|(site_notifications|vouchers)\|([0-9a-f-]{36})\|(title|message|code|description|discount_value)/i);
    if (editMatch) {
      const table=editMatch[1], id=editMatch[2], field=editMatch[3];
      const value=text.trim();
      if(!value || value.length>500) { await sendMessage(chatId,"Nilai kosong atau terlalu panjang (maksimal 500 karakter)."); return Response.json({ok:true}); }
      const body:Record<string,unknown>={}; body[field]=field==="discount_value"?Number(value):value;
      if(field==="discount_value" && (!Number.isFinite(Number(value)) || Number(value)<=0)) { await sendMessage(chatId,"Nilai diskon harus angka lebih dari 0."); return Response.json({ok:true}); }
      await mutate(table,id,"PATCH",body);
      await sendMessage(chatId,"✅ Perubahan berhasil disimpan.",{reply_markup:table==="site_notifications"?{inline_keyboard:[[{text:"Pengumuman",callback_data:"announcements"}]]}:{inline_keyboard:[[{text:"Voucher",callback_data:"vouchers"}]]}});
      return Response.json({ok:true});
    }
    const parts = text.split(/\s+/);
    const command = (parts[0] ?? "").split("@")[0].toLowerCase();
    const arg = parts[1];
    if (["/start", "/bantuan", "/help", "/panel"].includes(command)) {
      const commandSetup = await fetch("https://api.telegram.org/bot" + botToken + "/setMyCommands", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({commands:[{command:"start",description:"Buka panel admin"},{command:"panel",description:"Tampilkan panel admin"},{command:"pesanan",description:"Lihat pesanan terbaru"},{command:"detail",description:"Detail pesanan"},{command:"progress",description:"Ubah progress pesanan"},{command:"status",description:"Ubah status pesanan"},{command:"maintenance",description:"Kelola mode maintenance website"},{command:"bantuan",description:"Panduan bot"}]})});
      const commandResult = await commandSetup.json();
      if (!commandResult.ok) console.error("Telegram setMyCommands failed", commandResult);
      await sendMessage(chatId, "🛠️ <b>PANEL ADMIN — MATTHEW JOKI</b>\n\n<b>OPERASIONAL</b>\nPesanan dan ringkasan.\n\n<b>PENGELOLAAN WEBSITE</b>\nRole akun, pengumuman, dan voucher.\n\n<b>AKTIVITAS & MASUKAN</b>\nPengunjung dan ulasan.\n\nPilih menu di bawah. Perintah /panel tersedia dari menu perintah Telegram.", { reply_markup: mainMenu });
    } else if (command === "/maintenance") {
      const state = await getMaintenanceState();
      await sendMessage(chatId, maintenanceText(state), { reply_markup: maintenanceKeyboard });
    } else if (command === "/pesanan") {
      await showOrders(chatId);
    } else if (command === "/detail" || command === "/cari") {
      if (!arg) await sendMessage(chatId, "Format: <code>/detail NOMOR_PESANAN</code>");
      else {
        const order = await queryOrder(arg);
        await sendMessage(chatId, order ? formatOrder(order) : "❌ Pesanan tidak ditemukan.", { reply_markup: order ? orderKeyboard(arg) : mainMenu });
      }
    } else if (command === "/progress") {
      if (!arg || parts.length < 3) await sendMessage(chatId, "Format: <code>/progress NOMOR 50 Catatan progress</code>");
      else {
        const percent = Number(parts[2]);
        if (!Number.isInteger(percent) || percent < 0 || percent > 100) await sendMessage(chatId, "Persentase harus angka bulat 0–100.");
        else {
          const order = await queryOrder(arg);
          if (!order) await sendMessage(chatId, "❌ Pesanan tidak ditemukan.");
          else {
            await updateOrder(arg, { progress_percent: percent, progress_note: parts.slice(3).join(" ") || `Progress diperbarui menjadi ${percent}%` });
            await sendMessage(chatId, `✅ Progress pesanan <code>${esc(arg)}</code> diperbarui menjadi <b>${percent}%</b>.`, { reply_markup: orderKeyboard(arg) });
          }
        }
      }
    } else if (command === "/status") {
      if (!arg || !parts[2]) await sendMessage(chatId, "Format: <code>/status NOMOR STATUS</code>\\nStatus yang didukung: <code>Menunggu</code>, <code>Dalam pengerjaan</code>, <code>Menunggu konfirmasi client</code>, <code>Selesai</code>, <code>Ditunda</code>.");
      else {
        const raw = parts.slice(2).join(" ").trim().toLowerCase();
        const status = ["Menunggu", "Dalam pengerjaan", "Menunggu konfirmasi client", "Selesai", "Ditunda"].find(s => s.toLowerCase() === raw);
        if (!status) await sendMessage(chatId, "Status tidak valid.");
        else {
          const order = await queryOrder(arg);
          if (!order) await sendMessage(chatId, "❌ Pesanan tidak ditemukan.");
          else {
            const label = status;
            await updateOrder(arg, { status: label });
            await sendMessage(chatId, `✅ Status pesanan <code>${esc(arg)}</code> diubah menjadi <b>${label}</b>.`, { reply_markup: orderKeyboard(arg) });
          }
        }
      }
    } else {
      await sendMessage(chatId, "Perintah tidak dikenal. Gunakan menu tombol atau ketik /bantuan.", { reply_markup: mainMenu });
    }
  } catch (error) {
    console.error("Telegram admin bot error", error);
    const callback = update?.callback_query;
    if (callback?.message?.message_id) {
      await editMessage(chatId, callback.message.message_id, "⚠️ Terjadi kendala. Silakan coba lagi.", { reply_markup: mainMenu });
    } else {
      await sendMessage(chatId, "⚠️ Terjadi kendala saat memproses perintah. Coba lagi beberapa saat.", { reply_markup: mainMenu });
    }
  }
  return Response.json({ ok: true });
});