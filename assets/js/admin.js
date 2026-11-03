document.addEventListener("DOMContentLoaded", async () => {
  const client = window.supabaseClient;
  const notice = document.getElementById("adminNotice");
  const content = document.getElementById("dashboardContent");
  const welcome = document.getElementById("adminWelcome");
  const logout = document.getElementById("logoutButton");
  const roleOptions = ["SULTAN", "MATTHEW", "PELANGGAN"];

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

        if (member.role === "admin") {
          const badge = document.createElement("span");
          badge.className = "role-protected";
          badge.textContent = "Admin dilindungi";
          actionCell.append(badge);
        } else {
          const editor = document.createElement("div");
          editor.className = "role-editor";
          const select = document.createElement("select");
          select.setAttribute("aria-label", "Pilih role untuk " + (member.full_name || member.id));
          const placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = "Pilih role…";
          placeholder.selected = true;
          select.append(placeholder);
          roleOptions.forEach(role => {
            const option = document.createElement("option");
            option.value = role;
            option.textContent = role;
            select.append(option);
          });

          const save = document.createElement("button");
          save.type = "button";
          save.className = "role-save";
          save.textContent = "Simpan";
          save.addEventListener("click", async () => {
            const newRole = select.value;
            if (!roleOptions.includes(newRole)) {
              showNotice("Pilih salah satu role: SULTAN, MATTHEW, atau PELANGGAN.", true);
              select.focus();
              return;
            }
            const previousText = save.textContent;
            save.disabled = true;
            select.disabled = true;
            save.textContent = "Menyimpan…";
            try {
              const { error } = await client.rpc("admin_set_member_role", {
                p_user_id: member.id,
                p_new_role: newRole
              });
              if (error) throw error;
              showNotice("Role " + (member.full_name || "member") + " berhasil diubah menjadi " + newRole + ".");
              await loadMembers();
            } catch (error) {
              console.error("Role update failed:", error);
              showNotice("Role gagal diubah: " + (error?.message || "Kesalahan tidak diketahui") + ". Periksa detail di atas jika masih gagal.", true);
              save.disabled = false;
              select.disabled = false;
              save.textContent = previousText;
            }
          });
          editor.append(select, save);
          actionCell.append(editor);
        }

        tr.append(actionCell);
        membersBody.append(tr);
      });
    }

    const visitorsResult = await client.from("visitor_logs")
      .select("id, visitor_name, visited_at", { count: "exact" })
      .order("visited_at", { ascending: false })
      .limit(10);

    await loadMembers();

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
    showNotice("Dashboard dimuat. Admin dapat mengubah role anggota; otorisasi perubahan ditegakkan di database.");
  } catch (error) {
    console.error("Admin dashboard error:", error);
    showNotice("Terjadi kesalahan saat memverifikasi atau memuat dashboard. Periksa koneksi dan kebijakan RLS Supabase.", true);
  }
});
