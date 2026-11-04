document.addEventListener("DOMContentLoaded", async () => {
  const db = window.supabaseClient;
  const form = document.getElementById("workerApplicationForm");
  const state = document.getElementById("workerState");
  const say = (text, type = "") => { state.textContent = text; state.className = "feature-state " + type; };
  if (!db) return say("Koneksi database tidak tersedia. Muat ulang halaman.", "error");
  try {
    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) { location.replace("/login.html?next=%2Fworker.html"); return; }
    if (!user.email_confirmed_at) return say("Verifikasi email melalui Gmail sebelum mengirim pendaftaran.", "error");

    const { data: existing, error: existingError } = await db.from("worker_applications")
      .select("status,created_at,decision_note").eq("applicant_id", user.id)
      .order("created_at", { ascending: false }).limit(1);
    if (existingError) throw existingError;
    if (existing?.length && existing[0].status !== "rejected") {
      const app = existing[0];
      const statusLabel = app.status === "pending" ? "menunggu keputusan" : "disetujui";
      say("Pendaftaran kamu sudah tercatat dan saat ini " + statusLabel + ". Hasil keputusan dikirim melalui Inbox Matthew. " + (app.decision_note || ""), "success");
      return;
    }
    if (existing?.length && existing[0].status === "rejected") {
      say("Pendaftaran sebelumnya belum dapat diterima. Kamu boleh mengajukan kembali dengan informasi terbaru.", "error");
    }
    form.hidden = false;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const values = new FormData(form);
      const payload = {
        applicant_name: String(values.get("applicant_name") || "").trim(),
        worker_type: values.get("worker_type"),
        play_duration: String(values.get("play_duration") || "").trim(),
        account_capacity: String(values.get("account_capacity") || "").trim(),
        whatsapp_number: String(values.get("whatsapp_number") || "").trim(),
        consent: values.get("consent") === "on"
      };
      submit.disabled = true; submit.textContent = "MENGIRIM PENDAFTARAN…";
      say("Menyimpan pendaftaran dan mengirim notifikasi Telegram…");
      try {
        const { data, error } = await db.functions.invoke("worker-application-submit", { body: payload });
        if (error) throw error;
        if (!data?.ok || !data?.notification_sent) throw new Error(data?.error || "Notifikasi Telegram belum terkonfirmasi.");
        form.reset(); form.hidden = true;
        say("Pendaftaran berhasil dikirim dan notifikasi Telegram sudah diterima sistem. Silakan pantau Inbox Matthew untuk hasil seleksi.", "success");
      } catch (error) {
        console.error("Worker submission failed:", error);
        let serverMessage = "";
        try {
          const response = error?.context;
          if (response && typeof response.clone === "function") {
            const body = await response.clone().json();
            serverMessage = body?.error || body?.message || "";
            if (response.status === 409) {
              form.hidden = true;
              say("Pendaftaran kamu sudah tercatat dan masih menunggu keputusan admin. Tidak perlu mengirim ulang. Pantau Inbox dan tunggu keputusan dari Matthew.", "success");
              return;
            }
          }
        } catch (_) { /* keep the SDK error as fallback */ }
        say(serverMessage || error?.message || "Pendaftaran gagal dikirim. Silakan coba kembali.", "error");
        submit.disabled = false; submit.textContent = "KIRIM PENDAFTARAN";
      }
    });
  } catch (error) {
    console.error(error);
    say("Tidak dapat memeriksa akun atau status pendaftaran. " + (error.message || ""), "error");
  }
});
