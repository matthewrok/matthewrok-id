document.addEventListener("DOMContentLoaded", async () => {
  const db = window.supabaseClient;
  const state = document.getElementById("inboxState");
  const list = document.getElementById("inboxList");
  const composer = document.getElementById("inboxComposer");
  const feedback = document.getElementById("inboxFeedback");
  const say = (el, text, type = "") => { el.textContent = text; el.className = "feature-state " + type; };
  const fmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
  if (!db) return say(state, "Koneksi database tidak tersedia.", "error");
  try {
    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) { location.replace("/login.html?next=%2Finbox.html"); return; }
    const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) throw profileError;

    if (["admin", "MATTHEW"].includes(profile?.role)) {
      composer.hidden = false;
      const audience = composer.querySelector('[name="audience"]');
      const recipientField = document.getElementById("recipientField");
      const recipientSelect = composer.querySelector('[name="recipient_id"]');
      audience.addEventListener("change", () => { recipientField.hidden = audience.value !== "user"; });
      const { data: profiles, error: profilesError } = await db.from("profiles")
        .select("id,full_name,email,role").order("full_name", { ascending: true }).limit(1000);
      if (profilesError) throw profilesError;
      recipientSelect.replaceChildren(new Option("Pilih penerima…", ""));
      (profiles || []).filter(p => p.id !== user.id).forEach(p => {
        recipientSelect.add(new Option((p.full_name || p.email || "Member") + " · " + p.role, p.id));
      });
      document.getElementById("inboxSendForm").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget, data = new FormData(form);
        const target = String(data.get("audience"));
        if (target === "user" && !data.get("recipient_id")) return say(feedback, "Pilih penerima pesan terlebih dahulu.", "error");
        const button = form.querySelector("button[type=submit]");
        button.disabled = true; button.textContent = "MENGIRIM…";
        try {
          const { error } = await db.rpc("admin_send_inbox_message", {
            p_title: String(data.get("title")).trim(),
            p_body: String(data.get("body")).trim(),
            p_audience: target,
            p_recipient_id: target === "user" ? data.get("recipient_id") : null
          });
          if (error) throw error;
          form.reset(); recipientField.hidden = true;
          say(feedback, "Pesan berhasil dikirim ke penerima yang dipilih.", "success");
          await loadInbox(user.id);
        } catch (error) {
          console.error(error); say(feedback, "Pesan gagal dikirim: " + (error.message || "Kesalahan database."), "error");
        } finally { button.disabled = false; button.textContent = "KIRIM PESAN"; }
      });
    }

    async function loadInbox(userId) {
      say(state, "Memuat pesan…"); list.replaceChildren();
      const { data, error } = await db.from("inbox_messages")
        .select("id,title,body,created_at,inbox_recipients!inner(user_id,read_at)")
        .eq("inbox_recipients.user_id", userId)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      if (!data?.length) return say(state, "Belum ada pesan di Inbox kamu.");
      say(state, data.length + " pesan ditemukan.");
      for (const message of data) {
        const receipt = (message.inbox_recipients || []).find(r => r.user_id === userId);
        const card = document.createElement("article");
        card.className = "inbox-item" + (receipt?.read_at ? "" : " unread");
        const title = document.createElement("h2"); title.textContent = message.title;
        const meta = document.createElement("div"); meta.className = "inbox-meta";
        meta.textContent = fmt.format(new Date(message.created_at)) + (receipt?.read_at ? " · Sudah dibaca" : " · Belum dibaca");
        const body = document.createElement("p"); body.textContent = message.body;
        card.append(title, meta, body);
        if (!receipt?.read_at) {
          const button = document.createElement("button"); button.type = "button"; button.textContent = "Tandai sudah dibaca";
          button.addEventListener("click", async () => {
            button.disabled = true;
            const { error: updateError } = await db.from("inbox_recipients")
              .update({ read_at: new Date().toISOString() })
              .eq("message_id", message.id).eq("user_id", userId).is("read_at", null);
            if (updateError) { button.disabled = false; say(state, "Status baca gagal diperbarui: " + updateError.message, "error"); return; }
            card.classList.remove("unread"); meta.textContent = fmt.format(new Date(message.created_at)) + " · Sudah dibaca"; button.remove();
          });
          card.append(button);
        }
        list.append(card);
      }
    }
    await loadInbox(user.id);
  } catch (error) {
    console.error("Inbox load failed:", error);
    say(state, "Inbox tidak dapat dimuat. " + (error.message || "Periksa kebijakan akses database."), "error");
  }
});
