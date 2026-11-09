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

    async function loadMembers() {
      const membersBody = document.getElementById("membersBody");
      membersBody.replaceChildren();
      const { data: members, error: membersError, count } = await client
        .from("profiles")
        .select("id, full_name, role", { count: "exact" })
        .order("full_name", { ascending: true })
        .limit(1000);

      if (membersError) {
        emptyRow(membersBody, 4, "Data anggota tidak dapat dimuat. Periksa policy RLS profiles.");
        document.getElementById("memberCount").textContent = "!";
        throw membersError;
      }

      document.getElementById("memberCount").textContent = String(count ?? members.length);
      if (!members.length) {
        emptyRow(membersBody, 4, "Belum ada anggota.");
        return;
      }

      members.forEach(member => {
        const tr = document.createElement("tr");
        tr.append(cell(member.full_name), cell(member.id), cell(member.role || "member"));
        const actionCell = document.createElement("td");

        const badge = document.createElement("span");
        badge.className = member.role === "admin" ? "role-protected" : "role-protected";
        badge.textContent = member.role === "admin" ? "Admin dilindungi" : "Kenaikan otomatis";
        actionCell.append(badge);

        tr.append(actionCell);
        membersBody.append(tr);
      });
    }


    async function loadStatisticsAndActivity() {
      const countQuery = (table, configure) => {
        let query = client.from(table).select("*", { count: "exact", head: true });
        if (configure) query = configure(query);
        return query;
      };
      const [orders, active, completed, reviews] = await Promise.all([
        countQuery("joki_progress"),
        countQuery("joki_progress", q => q.in("status", ["Menunggu", "Dalam pengerjaan", "Menunggu konfirmasi client", "Ditunda"])),
        countQuery("joki_progress", q => q.eq("status", "Selesai")),
        countQuery("joki_reviews", q => q.eq("moderation_status", "approved"))
      ]);
      [["orderTotal",orders],["orderActive",active],["orderCompleted",completed],["reviewTotal",reviews]].forEach(([id,result]) => {
        document.getElementById(id).textContent = result.error ? "—" : String(result.count ?? 0);
        if (result.error) console.warn("Statistik "+id+" tidak tersedia:",result.error.message);
      });
      const feed=document.getElementById("activityFeed");
      const [recentOrders,recentMessages]=await Promise.all([
        client.from("joki_progress").select("client_name,service_name,status,updated_at,created_at").order("updated_at",{ascending:false}).limit(8),
        client.from("inbox_messages").select("title,audience,created_at").order("created_at",{ascending:false}).limit(8)
      ]);
      const items=[];
      if(!recentOrders.error)(recentOrders.data||[]).forEach(x=>items.push({kind:"Pesanan",title:x.service_name||"Pesanan client",detail:(x.client_name||"Client")+" · "+(x.status||"Status belum diatur"),at:x.updated_at||x.created_at}));
      else console.warn("Aktivitas pesanan tidak tersedia:",recentOrders.error.message);
      if(!recentMessages.error)(recentMessages.data||[]).forEach(x=>items.push({kind:"Inbox",title:x.title||"Pesan resmi",detail:x.audience==="all"?"Semua penerima":x.audience==="members"?"Member dan role":"Penerima terpilih",at:x.created_at}));
      else console.warn("Aktivitas Inbox tidak tersedia:",recentMessages.error.message);
      items.sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
      feed.replaceChildren();
      if(!items.length){const p=document.createElement("p");p.textContent="Belum ada aktivitas terbaru yang dapat ditampilkan.";feed.append(p);return;}
      items.slice(0,10).forEach(item=>{
        const article=document.createElement("article");article.className="activity-item";
        const kind=document.createElement("span");kind.className="activity-kind";kind.textContent=item.kind;
        const title=document.createElement("strong");title.textContent=item.title;
        const detail=document.createElement("p");detail.textContent=item.detail;
        const time=document.createElement("time");time.textContent=item.at?dateFormat.format(new Date(item.at)):"Waktu tidak tersedia";
        article.append(kind,title,detail,time);feed.append(article);
      });
    }

    async function loadVisitors() {
      const visitorsBody = document.getElementById("visitorsBody");
      const visitorsResult = await client.from("visitor_logs")
        .select("id, visitor_name, visited_at", { count: "exact" })
        .order("visited_at", { ascending: false })
        .limit(10);

      if (visitorsResult.error) {
        emptyRow(visitorsBody, 2, "Log kunjungan belum tersedia. Pastikan supabase/visitor-logs-setup.sql sudah dijalankan.");
        document.getElementById("visitorCount").textContent = "—";
        console.warn("Log kunjungan tidak tersedia:", visitorsResult.error.message);
        return;
      }

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

    const refreshButton = document.getElementById("refreshDashboardButton");
    let refreshInProgress = false;
    async function refreshDashboard(quiet = false) {
      if (refreshInProgress || document.visibilityState !== "visible") return;
      refreshInProgress = true;
      if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "↻ Memperbarui…";
      }
      if (!quiet) showNotice("Memperbarui ringkasan, pengguna, pesanan, dan kunjungan…");
      try {
        await Promise.all([loadMembers(), loadVisitors(), loadStatisticsAndActivity()]);
        document.getElementById("lastUpdated").textContent = dateFormat.format(new Date());
        if (!quiet) showNotice("Data dashboard berhasil diperbarui.");
        else showNotice("Dashboard aktif · data diperbarui otomatis.");
      } catch (error) {
        console.error("Dashboard refresh error:", error);
        showNotice("Pembaruan data gagal. Periksa koneksi dan kebijakan RLS Supabase.", true);
      } finally {
        refreshInProgress = false;
        if (refreshButton) {
          refreshButton.disabled = false;
          refreshButton.textContent = "↻ Perbarui data";
        }
      }
    }

    refreshButton?.addEventListener("click", () => refreshDashboard(false));
    window.setInterval(() => {
      if (document.visibilityState === "visible") refreshDashboard(true);
    }, 60_000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshDashboard(true);
    });

    await refreshDashboard(true);
  } catch (error) {
    console.error("Admin dashboard error:", error);
    showNotice("Terjadi kesalahan saat memverifikasi atau memuat dashboard. Periksa koneksi dan kebijakan RLS Supabase.", true);
  }
});
