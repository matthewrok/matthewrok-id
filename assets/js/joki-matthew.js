(() => {
  const db = window.supabaseClient;
  const $ = id => document.getElementById(id);
  document.querySelectorAll("[data-current-year]").forEach(el => el.textContent = new Date().getFullYear());
  const showMessage = (id, text, type = "") => { const el = $(id); el.textContent = text; el.className = "message" + (type ? " " + type : ""); };
  const formatDate = value => value ? new Date(value).toLocaleString("id-ID", {dateStyle:"medium",timeStyle:"short"}) : "-";
  const setBusy = (button, busy, busyText, normalText) => { button.disabled = busy; button.textContent = busy ? busyText : normalText; };
  $("lookupForm").addEventListener("submit", async event => {
    event.preventDefault();
    const rawToken = $("progressToken").value.trim().toUpperCase();
    // Allow pasting the whole WhatsApp line (label + token), not only the token itself.
    const tokenMatch = rawToken.match(/MJ-[A-F0-9]{64}/);
    const token = tokenMatch ? tokenMatch[0] : rawToken.replace(/\s+/g, "");
    $("progressResult").classList.add("hidden");
    showMessage("lookupMessage", "");
    setBusy($("lookupButton"), true, "MEMERIKSA...", "BUKA PESANAN");
    try {
      if (/^MJ-\d{6}-[A-F0-9]{8}$/.test(token)) {
        showMessage("lookupMessage", "Kode pesanan lama bukan token pelacakan rahasia yang baru. Login ke akun pemilik pesanan, buka Pesanan Saya, lalu tekan Lacak untuk mengambil token baru secara aman.", "error");
        return;
      }
      const {data, error} = await db.rpc("lookup_joki_progress_secure", {p_token: token});
      if (error) throw error;
      const order = Array.isArray(data) ? data[0] : data;
      if (!order) { showMessage("lookupMessage", "Token tidak ditemukan. Periksa kembali token dari admin.", "error"); return; }
      $("resultService").textContent = order.service_name || "Layanan Joki";
      $("resultOrderNumber").textContent = order.order_number || "—";
      $("resultQuantity").textContent = order.quantity ? order.quantity + " karakter" : "-";
      $("resultTotal").textContent = Number(order.total_price) > 0 ? "Rp" + Number(order.total_price).toLocaleString("id-ID") : "Menunggu konfirmasi";
      const statusBadge = $("resultStatus");
      const orderStatus = String(order.status || "Menunggu").trim();
      statusBadge.textContent = orderStatus;
      statusBadge.classList.remove("process", "success", "cancel");
      if (orderStatus.toLocaleLowerCase("id-ID") === "selesai") {
        statusBadge.classList.add("success");
      } else if (orderStatus.toLocaleLowerCase("id-ID") === "dibatalkan") {
        statusBadge.classList.add("cancel");
      } else {
        statusBadge.classList.add("process");
      }
      $("resultClient").textContent = order.client_name || "Client";
      $("resultPercent").textContent = Math.max(0, Math.min(100, Number(order.progress_percent) || 0)) + "%";
      $("resultBar").style.width = $("resultPercent").textContent;
      $("resultUpdated").textContent = formatDate(order.updated_at);
      $("resultNote").textContent = order.progress_note || "Belum ada catatan dari admin.";
      $("reviewSection").classList.toggle("hidden", order.status !== "Selesai");
      $("reviewForm").reset();
      $("reviewMessage").textContent = "";
      syncReviewIdentity();
      $("existingReview").classList.add("hidden");
      if (order.status === "Selesai") {
        const {data: priorReview, error: reviewLookupError} = await db.rpc("lookup_joki_review_secure", {p_token: token});
        if (!reviewLookupError && priorReview && priorReview.length) {
          $("reviewSection").classList.add("hidden");
          const review = priorReview[0];
          $("existingReview").textContent = "Terima kasih! Kamu sudah memberi penilaian " + "★".repeat(review.rating) + "☆".repeat(5-review.rating) + (review.review_text ? " — “" + review.review_text + "”" : "");
          $("existingReview").classList.remove("hidden");
        }
      }
      $("progressResult").classList.remove("hidden");
      showMessage("lookupMessage", "Progres berhasil ditemukan.", "success");
    } catch (error) {
      showMessage("lookupMessage", "Belum dapat memeriksa token. Pastikan setup database sudah selesai.", "error");
      console.error(error);
    } finally { setBusy($("lookupButton"), false, "MEMERIKSA...", "BUKA PESANAN"); }
  });
  // Interactive star rating: selecting star N fills stars 1 through N.
  const starPicker = document.querySelector(".star-picker");
  if (starPicker) {
    const starLabels = [...starPicker.querySelectorAll("label[for^='rating']")];
    const ratingFeedback = document.getElementById("ratingFeedback");
    const ratingNames = ["", "Kurang", "Cukup", "Baik", "Sangat Baik", "Sempurna"];
    const paintStars = rating => {
      starPicker.dataset.rating = String(rating);
      starLabels.forEach(label => {
        const value = Number(label.htmlFor.replace("rating", ""));
        label.classList.toggle("is-active", value <= rating);
        label.classList.toggle("is-current", value === rating);
        label.setAttribute("aria-checked", String(value === rating));
      });
      if (ratingFeedback) {
        ratingFeedback.textContent = rating ? `${rating} dari 5 bintang — ${ratingNames[rating]}` : "Belum ada rating dipilih";
        ratingFeedback.classList.toggle("has-rating", rating > 0);
      }
    };
    starLabels.forEach(label => {
      label.addEventListener("click", () => {
        const input = document.getElementById(label.htmlFor);
        if (!input) return;
        input.checked = true;
        paintStars(Number(input.value));
      });
      label.addEventListener("mouseenter", () => paintStars(Number(label.htmlFor.replace("rating", ""))));
      label.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          label.click();
        }
      });
    });
    starPicker.addEventListener("mouseleave", () => {
      const selected = starPicker.querySelector("input[name='rating']:checked");
      paintStars(selected ? Number(selected.value) : 0);
    });
    starPicker.querySelectorAll("input[name='rating']").forEach(input => {
      input.addEventListener("change", () => paintStars(Number(input.value)));
    });
    paintStars(0);
  }

  // Database features require the Supabase client; the star picker above works independently.
  if (!db) {
    console.error("Supabase client belum siap. Fitur rating tetap aktif; fitur database dinonaktifkan.");
    return;
  }

  const syncReviewIdentity = () => {
    const choice = document.querySelector('input[name="reviewIdentity"]:checked')?.value || "named";
    const consentWrap = $("reviewConsentWrap");
    const consent = $("reviewConsent");
    const isNamed = choice === "named";
    consentWrap.classList.toggle("hidden", !isNamed);
    consent.required = isNamed;
    if (!isNamed) consent.checked = false;
  };
  document.querySelectorAll('input[name="reviewIdentity"]').forEach(input => input.addEventListener("change", syncReviewIdentity));
  syncReviewIdentity();

  $("reviewForm").addEventListener("submit", async event => {
    event.preventDefault();
    const token = $("progressToken").value.trim().toUpperCase();
    const rating = Number(new FormData($("reviewForm")).get("rating"));
    if (!rating) { showMessage("reviewMessage", "Pilih rating bintang terlebih dahulu.", "error"); return; }
    const identityChoice = document.querySelector('input[name="reviewIdentity"]:checked')?.value || "named";
    if (identityChoice === "named" && !$("reviewConsent").checked) {
      showMessage("reviewMessage", "Centang persetujuan jika ingin menampilkan nama.", "error");
      return;
    }
    const button = $("submitReview");
    setBusy(button, true, "MENGIRIM...", "KIRIM ULASAN");
    try {
      const {error} = await db.rpc("submit_joki_review_secure", {
        p_token: token,
        p_rating: rating,
        p_review_text: $("reviewText").value.trim(),
        p_display_name: identityChoice === "named"
      });
      if (error) throw error;
      showMessage("reviewMessage", "Terima kasih! Ulasanmu berhasil dikirim.", "success");
      $("reviewSection").classList.add("hidden");
      $("existingReview").textContent = "Terima kasih! Ulasanmu berhasil dipublikasikan sebagai " + (identityChoice === "named" ? "nama client" : "Anonim Matthew") + ". " + "★".repeat(rating) + "☆".repeat(5-rating);
      $("existingReview").classList.remove("hidden");
    } catch (error) {
      showMessage("reviewMessage", error.message || "Ulasan belum dapat dikirim. Pastikan setup ulasan sudah dijalankan.", "error");
    } finally { setBusy(button, false, "MENGIRIM...", "KIRIM ULASAN"); }
  });

  // Orders opened from Pesanan Saya pass the owner-only token through sessionStorage,
  // never through a URL/query string or browser history.
  const recoveredToken = sessionStorage.getItem("matthewProgressToken");
  if (recoveredToken) {
    sessionStorage.removeItem("matthewProgressToken");
    $("progressToken").value = recoveredToken;
    const clearButton = $("clearTokenBtn");
    if (clearButton) clearButton.style.display = "block";
    window.setTimeout(() => $("lookupForm").requestSubmit(), 0);
  }

})();
