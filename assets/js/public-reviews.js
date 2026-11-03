(() => {
  const db = window.supabaseClient;
  const box = document.getElementById("publicReviews");
  const summary = document.getElementById("reviewSummary");
  if (!db || !box || !summary) return;
  const formatDate = value => value ? new Date(value).toLocaleDateString("id-ID", {dateStyle:"medium"}) : "";
  async function loadPublicReviews() {
    try {
      const {data, error} = await db.rpc("get_public_joki_reviews");
      if (error) throw error;
      const reviews = data || [];
      const count = reviews.length;
      const average = count ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / count : 0;
      summary.replaceChildren();
      const score = document.createElement("strong");
      score.textContent = count ? average.toFixed(1) + " ★" : "—";
      const label = document.createElement("span");
      label.textContent = count ? count + " ulasan client yang mengizinkan ulasannya ditampilkan" : "Belum ada ulasan publik yang tersedia.";
      summary.append(score, label);
      box.replaceChildren();
      if (!count) {
        const empty = document.createElement("p");
        empty.className = "reviews-intro";
        empty.textContent = "Ulasan dari client akan tampil di sini setelah tersedia dan disetujui untuk ditampilkan.";
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
        stars.textContent = "★".repeat(Number(review.rating)) + "☆".repeat(5 - Number(review.rating));
        stars.setAttribute("aria-label", review.rating + " dari 5 bintang");
        top.append(name, stars);
        const body = document.createElement("p");
        body.textContent = review.review_text || "Client memberi rating tanpa komentar.";
        const date = document.createElement("time");
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