document.addEventListener("DOMContentLoaded", async () => {
  const client = window.supabaseClient;
  const notice = document.getElementById("adminNotice");
  const content = document.getElementById("dashboardContent");
  const welcome = document.getElementById("adminWelcome");
  const logout = document.getElementById("logoutButton");

  function showNotice(message, error = false) {
    notice.textContent = message;
    notice.className = "notice" + (error ? " error" : "");
  }
  function cell(value) {
    const td = document.createElement("td");
    td.textContent = value == null || value === "" ? "—" : String(value);
    return td;
  }
  function emptyRow(body, columns, message) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = columns;
    td.className = "empty";
    td.textContent = message;
    tr.appendChild(td);
    body.replaceChildren(tr);
  }
  const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

  logout.addEventListener("click", async () => {
    logout.disabled = true;
    try {
      if (client) await client.auth.signOut();
    } finally {
      sessionStorage.removeItem("matthewVisitorName");
      localStorage.removeItem("matthewLastActivity");
      location.replace("/login.html");
    }
  });

  if (!client) {
    showNotice("Koneksi Supabase belum tersedia. Muat ulang halaman atau periksa konfigurasi.", true);
    return;
  }
  try {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) {
      showNotice("Silakan login dengan akun admin untuk membuka panel ini.", true);
      location.replace("/login.html?next=%2Fadmin%2Fdashboard.html");
      return;
    }
    const { data: profile, error: profileError } = await client
      .from("profiles").select("full_name, role").eq("id", sessionData.session.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.role !== "admin") {
      showNotice("Akses ditolak. Halaman ini hanya untuk akun admin.", true);
      await client.auth.signOut();
      window.setTimeout(() => location.replace("/index.html"), 1200);
      return;
    }
    welcome.textContent = "Masuk sebagai " + (profile.full_name || sessionData.session.user.email || "Admin");
    content.hidden = false;
    showNotice("Akses admin terverifikasi. Memuat ringkasan data…");

    const [membersResult, visitorsResult] = await Promise.all([
      client.from("profiles").select("id, full_name, role", { count: "exact" }).order("full_name", { ascending: true }).limit(10),
      client.from("visitor_logs").select("id, visitor_name, visited_at", { count: "exact" }).order("visited_at", { ascending: false }).limit(10)
    ]);

    const membersBody = document.getElementById("membersBody");
    if (membersResult.error) {
      emptyRow(membersBody, 3, "Data anggota tidak dapat dimuat. Periksa policy RLS profiles.");
      document.getElementById("memberCount").textContent = "!";
    } else {
      document.getElementById("memberCount").textContent = String(membersResult.count ?? membersResult.data.length);
      if (!membersResult.data.length) emptyRow(membersBody, 3, "Belum ada anggota.");
      else {
        membersBody.replaceChildren();
        membersResult.data.forEach(member => {
          const tr = document.createElement("tr");
          tr.append(cell(member.full_name), cell(member.id), cell(member.role || "member"));
          membersBody.appendChild(tr);
        });
      }
    }

    const visitorsBody = document.getElementById("visitorsBody");
    if (visitorsResult.error) {
      emptyRow(visitorsBody, 2, "Log kunjungan belum tersedia. Pastikan supabase/visitor-logs-setup.sql sudah dijalankan.");
      document.getElementById("visitorCount").textContent = "—";
    } else {
      document.getElementById("visitorCount").textContent = String(visitorsResult.count ?? visitorsResult.data.length);
      if (!visitorsResult.data.length) emptyRow(visitorsBody, 2, "Belum ada kunjungan tercatat.");
      else {
        visitorsBody.replaceChildren();
        visitorsResult.data.forEach(visitor => {
          const tr = document.createElement("tr");
          tr.append(cell(visitor.visitor_name), cell(dateFormat.format(new Date(visitor.visited_at))));
          visitorsBody.appendChild(tr);
        });
      }
    }
    document.getElementById("lastUpdated").textContent = dateFormat.format(new Date());
    showNotice("Dashboard dimuat. Data yang ditampilkan mengikuti izin database akun admin.");
  } catch (error) {
    console.error("Admin dashboard error:", error);
    showNotice("Terjadi kesalahan saat memverifikasi atau memuat dashboard. Periksa koneksi dan kebijakan RLS Supabase.", true);
  }
});