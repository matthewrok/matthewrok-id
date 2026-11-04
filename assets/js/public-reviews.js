(() => {
  const db = window.supabaseClient;
  const box = document.getElementById("publicReviews");
  const summary = document.getElementById("reviewSummary");
  if (!db || !box || !summary) return;

  const formatDate = value => value
    ? new Date(value).toLocaleDateString("id-ID", {dateStyle:"medium"})
    : "";

  async function loadPublicReviews() {
    try {
      const {data, error} = await db.rpc("get_public_joki_reviews");
      if (error) throw error;

      const reviews = Array.isArray(data) ? data : [];
      const count = reviews.length;
      const average = count
        ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / count
        : 0;

      summary.replaceChildren();
      const score = document.createElement("strong");
      score.textContent = count ? average.toFixed(1) + " / 5 ★" : "—";
      const label = document.createElement("span");
      label.textContent = count
        ? count + " ulasan terbaru yang telah disetujui"
        : "Belum ada ulasan yang disetujui untuk ditampilkan.";
      summary.append(score, label);

      box.replaceChildren();
      if (!count) {
        const empty = document.createElement("p");
        empty.className = "reviews-intro";
        empty.textContent = "Ulasan client akan tampil di sini setelah pesanan selesai dan ulasan disetujui admin.";
        box.append(empty);
        return;
      }

      reviews.forEach(review => {
        const card = document.createElement("article");
        card.className = "review-card";

        const top = document.createElement("div");
        top.className = "review-card-top";

        const name = document.createElement("strong");
        name.textContent = review.client_name || "Client Matthew";

        const stars = document.createElement("span");
        stars.className = "review-stars";
        const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
        stars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);
        stars.setAttribute("aria-label", rating + " dari 5 bintang");
        top.append(name, stars);

        const body = document.createElement("p");
        body.textContent = review.review_text || "Client memberikan rating tanpa komentar.";

        const date = document.createElement("time");
        date.dateTime = review.created_at || "";
        date.textContent = formatDate(review.created_at);

        card.append(top, body, date);
        box.append(card);
      });
    } catch (error) {
      console.warn("Ulasan publik belum dapat dimuat:", error);
      summary.replaceChildren();
      const label = document.createElement("span");
      label.textContent = "Ulasan sedang tidak dapat dimuat. Silakan coba lagi nanti.";
      summary.append(label);
      box.replaceChildren();
    }
  }

  loadPublicReviews();
})();