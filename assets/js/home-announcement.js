/* Homepage ticker: displays the newest active public announcement from the admin notification center. */
document.addEventListener("DOMContentLoaded", async () => {
  const ticker = document.getElementById("announcementTicker");
  const track = document.getElementById("announcementTrack");
  const db = window.supabaseClient;
  if (!ticker || !track || !db) return;

  try {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("site_notifications")
      .select("title,message,created_at")
      .eq("is_active", true)
      .eq("audience", "all")
      .or("expires_at.is.null,expires_at.gt." + now)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    const notice = data && data[0];
    if (!notice) return;

    const title = (notice.title || "").trim();
    const message = (notice.message || "").trim();
    const announcement = [title, message].filter(Boolean).join(" — ");
    if (!announcement) return;

    // Use textContent to prevent announcement text from being interpreted as HTML.
    track.textContent = "✦ " + announcement + " ✦";
    ticker.hidden = false;

    // Keep the motion readable and avoid a long blank interval for short announcements.
    const duration = Math.max(14, Math.min(36, announcement.length * 0.22));
    track.style.animationDuration = duration + "s, 5s";
  } catch (error) {
    // Fail closed: don't show stale or hard-coded text if public notifications cannot load.
    ticker.hidden = true;
    console.warn("Pengumuman beranda belum dapat dimuat.", error);
  }
});
