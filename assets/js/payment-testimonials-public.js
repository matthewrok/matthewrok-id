(() => {
  "use strict";
  const db = window.supabaseClient;
  const gallery = document.getElementById("testimonialGallery");
  const count = document.getElementById("galleryCount");
  const dialog = document.getElementById("imageDialog");
  const dialogImage = document.getElementById("dialogImage");
  const dialogCaption = document.getElementById("dialogCaption");
  const closeDialog = document.getElementById("closeImageDialog");
  if (!gallery || !count) return;

  const formatDate = value => {
    if (!value) return "Tanggal tidak dicantumkan";
    const date = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
    return Number.isNaN(date.getTime()) ? "Tanggal tidak dicantumkan" :
      new Intl.DateTimeFormat("id-ID", {dateStyle:"medium"}).format(date);
  };

  function showEmpty(message) {
    gallery.replaceChildren();
    const state = document.createElement("p");
    state.className = "gallery-state";
    state.textContent = message;
    gallery.append(state);
  }

  async function loadGallery() {
    if (!db) {
      count.textContent = "Tidak tersedia";
      showEmpty("Galeri sedang tidak dapat dimuat. Silakan coba kembali nanti.");
      return;
    }
    try {
      const {data, error} = await db.from("payment_testimonials")
        .select("id,image_path,caption,transaction_date,created_at")
        .eq("published", true)
        .order("display_order", {ascending:true})
        .order("created_at", {ascending:false});
      if (error) throw error;
      const items = Array.isArray(data) ? data : [];
      count.textContent = items.length + " dokumentasi";
      if (!items.length) {
        showEmpty("Dokumentasi pembayaran akan ditampilkan di sini.");
        return;
      }
      gallery.replaceChildren();
      items.forEach(item => {
        const {data:publicData} = db.storage.from("payment-testimonials").getPublicUrl(item.image_path);
        const card = document.createElement("article");
        card.className = "testimonial-card";
        const preview = document.createElement("button");
        preview.type = "button";
        preview.className = "testimonial-image-button";
        preview.setAttribute("aria-label", "Perbesar bukti pembayaran");
        const image = document.createElement("img");
        image.src = publicData.publicUrl;
        image.alt = "Bukti pembayaran MATTHEW JOKI dengan watermark";
        image.loading = "lazy";
        image.decoding = "async";
        preview.append(image);
        preview.addEventListener("click", () => {
          dialogImage.src = publicData.publicUrl;
          dialogCaption.textContent = item.caption || "Dokumentasi pembayaran · " + formatDate(item.transaction_date || item.created_at?.slice(0,10));
          if (typeof dialog.showModal === "function") dialog.showModal();
          else window.open(publicData.publicUrl, "_blank", "noopener");
        });
        const copy = document.createElement("div");
        copy.className = "testimonial-card-copy";
        const caption = document.createElement("strong");
        caption.textContent = item.caption || "Dokumentasi pembayaran";
        const date = document.createElement("time");
        const dateValue = item.transaction_date || item.created_at?.slice(0,10) || "";
        date.dateTime = dateValue;
        date.textContent = formatDate(dateValue);
        copy.append(caption,date);
        card.append(preview,copy);
        gallery.append(card);
      });
    } catch (error) {
      console.error("[Payment testimonials] Failed to load:", error);
      count.textContent = "Tidak tersedia";
      showEmpty("Galeri sedang mengalami kendala. Silakan coba kembali nanti.");
    }
  }

  closeDialog?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog?.addEventListener("close", () => {
    dialogImage.removeAttribute("src");
    dialogCaption.textContent = "";
  });
  loadGallery();
})();