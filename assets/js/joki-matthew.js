(() => {
  const SUPABASE_URL = "https://aqiwrgnxwtphhwikqtmn.supabase.co";
  const SUPABASE_KEY = "sb_publishable_t1sQ82_X8C1sxgwgTGeOVw_g5gewmtv";
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);
  document.querySelectorAll("[data-current-year]").forEach(el => el.textContent = new Date().getFullYear());
  const showMessage = (id, text, type = "") => { const el = $(id); el.textContent = text; el.className = "message" + (type ? " " + type : ""); };
  const formatDate = value => value ? new Date(value).toLocaleString("id-ID", {dateStyle:"medium",timeStyle:"short"}) : "-";
  const setBusy = (button, busy, busyText, normalText) => { button.disabled = busy; button.textContent = busy ? busyText : normalText; };
  $("lookupForm").addEventListener("submit", async event => {
    event.preventDefault();
    const token = $("progressToken").value.trim().toUpperCase();
    $("progressResult").classList.add("hidden");
    showMessage("lookupMessage", "");
    setBusy($("lookupButton"), true, "MEMERIKSA...", "CEK PROGRES");
    try {
      const {data, error} = await db.rpc("lookup_joki_progress", {p_token: token});
      if (error) throw error;
      const order = Array.isArray(data) ? data[0] : data;
      if (!order) { showMessage("lookupMessage", "Token tidak ditemukan. Periksa kembali token dari admin.", "error"); return; }
      $("resultService").textContent = order.service_name || "Layanan Joki";
      $("resultStatus").textContent = order.status || "Menunggu";
      $("resultClient").textContent = order.client_name || "Client";
      $("resultPercent").textContent = Math.max(0, Math.min(100, Number(order.progress_percent) || 0)) + "%";
      $("resultBar").style.width = $("resultPercent").textContent;
      $("resultUpdated").textContent = formatDate(order.updated_at);
      $("resultNote").textContent = order.progress_note || "Belum ada catatan dari admin.";
      $("progressResult").classList.remove("hidden");
      showMessage("lookupMessage", "Progres berhasil ditemukan.", "success");
    } catch (error) {
      showMessage("lookupMessage", "Belum dapat memeriksa token. Pastikan setup database sudah selesai.", "error");
      console.error(error);
    } finally { setBusy($("lookupButton"), false, "MEMERIKSA...", "CEK PROGRES"); }
  });
  $("orderPercent").addEventListener("input", () => $("percentLabel").textContent = $("orderPercent").value + "%");
  let adminUserId = null;
  async function checkAdmin() {
    const {data:{session}} = await db.auth.getSession();
    if (!session) { adminUserId = null; $("adminWorkspace").classList.add("hidden"); return false; }
    const {data:profile, error} = await db.from("profiles").select("role").eq("id", session.user.id).single();
    if (error || profile?.role !== "admin") {
      adminUserId = null; $("adminWorkspace").classList.add("hidden");
      showMessage("adminMessage", "Sesi ini bukan akun admin. Login menggunakan akun admin website.", "error");
      return false;
    }
    adminUserId = session.user.id;
    $("adminWorkspace").classList.remove("hidden");
    $("adminLoginForm").classList.add("hidden");
    showMessage("adminMessage", "Login admin berhasil.", "success");
    await loadOrders();
    return true;
  }
  $("adminLoginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("adminLoginForm").querySelector('button[type="submit"]');
    setBusy(button, true, "MEMERIKSA...", "LOGIN ADMIN");
    try {
      const {error} = await db.auth.signInWithPassword({email:$("adminEmail").value.trim(),password:$("adminPassword").value});
      if (error) throw error;
      const ok = await checkAdmin();
      if (!ok) {
        await db.auth.signOut();
        $("adminLoginForm").classList.remove("hidden");
      }
    } catch(error) {
      showMessage("adminMessage", error.message || "Login admin gagal.", "error");
    } finally { setBusy(button, false, "MEMERIKSA...", "LOGIN ADMIN"); }
  });
  async function loadOrders() {
    if (!adminUserId) return;
    const tbody = $("orderRows");
    tbody.innerHTML = "";
    const {data, error} = await db.from("joki_progress").select("id,token,client_name,service_name,status,progress_percent,progress_note,updated_at").order("created_at",{ascending:false});
    if (error) { showMessage("adminMessage", "Gagal memuat pesanan: " + error.message, "error"); return; }
    if (!data?.length) { tbody.innerHTML = '<tr><td colspan="5">Belum ada pesanan. Buat token pertama melalui formulir di atas.</td></tr>'; return; }
    data.forEach(order => {
      const tr = document.createElement("tr");
      const tokenTd = document.createElement("td"); const code = document.createElement("span"); code.className="token-code"; code.textContent=order.token; tokenTd.append(code);
      const clientTd = document.createElement("td"); const name=document.createElement("strong"); name.textContent=order.client_name; const service=document.createElement("div"); service.textContent=order.service_name; service.style.color="#bca897"; clientTd.append(name,service);
      const statusTd=document.createElement("td"); statusTd.textContent=order.status;
      const percentTd=document.createElement("td"); percentTd.textContent=(Number(order.progress_percent)||0)+"%";
      const actions=document.createElement("td");
      const edit=document.createElement("button"); edit.className="action-btn"; edit.textContent="EDIT"; edit.type="button"; edit.addEventListener("click",()=>editOrder(order));
      const copy=document.createElement("button"); copy.className="action-btn"; copy.textContent="SALIN TOKEN"; copy.type="button"; copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(order.token);showMessage("adminMessage","Token disalin: "+order.token,"success");}catch{showMessage("adminMessage","Token: "+order.token,"success");}});
      const remove=document.createElement("button"); remove.className="action-btn"; remove.textContent="HAPUS"; remove.type="button"; remove.addEventListener("click",()=>deleteOrder(order));
      actions.append(edit,copy,remove); tr.append(tokenTd,clientTd,statusTd,percentTd,actions); tbody.append(tr);
    });
  }
  function editOrder(order) {
    $("orderId").value=order.id; $("clientName").value=order.client_name; $("serviceName").value=order.service_name; $("orderStatus").value=order.status; $("orderPercent").value=order.progress_percent; $("percentLabel").textContent=order.progress_percent+"%"; $("orderNote").value=order.progress_note||"";
    $("saveOrder").textContent="SIMPAN PERUBAHAN"; $("cancelEdit").classList.remove("hidden"); $("orderForm").scrollIntoView({behavior:"smooth",block:"center"});
  }
  function resetOrderForm() { $("orderForm").reset(); $("orderId").value=""; $("orderPercent").value=0; $("percentLabel").textContent="0%"; $("saveOrder").textContent="BUAT TOKEN & PESANAN"; $("cancelEdit").classList.add("hidden"); }
  $("cancelEdit").addEventListener("click",resetOrderForm);
  $("orderForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!adminUserId) { showMessage("adminMessage","Login sebagai admin terlebih dahulu.","error"); return; }
    const id=$("orderId").value;
    const payload={client_name:$("clientName").value.trim(),service_name:$("serviceName").value.trim(),status:$("orderStatus").value,progress_percent:Number($("orderPercent").value),progress_note:$("orderNote").value.trim(),updated_at:new Date().toISOString()};
    if (!id) payload.token=makeToken();
    const button=$("saveOrder"); setBusy(button,true,"MENYIMPAN...",id?"SIMPAN PERUBAHAN":"BUAT TOKEN & PESANAN");
    try {
      const result=id ? await db.from("joki_progress").update(payload).eq("id",id) : await db.from("joki_progress").insert(payload);
      if (result.error) throw result.error;
      resetOrderForm(); showMessage("adminMessage",id?"Progres pesanan berhasil diperbarui.":"Pesanan dibuat. Salin token dari daftar untuk diberikan kepada client.","success"); await loadOrders();
    } catch(error) { showMessage("adminMessage","Gagal menyimpan: "+(error.message||"periksa setup database dan kebijakan akses."),"error"); }
    finally { setBusy(button,false,"MENYIMPAN...",id?"SIMPAN PERUBAHAN":"BUAT TOKEN & PESANAN"); }
  });
  function makeToken() {
    const bytes=new Uint8Array(8); crypto.getRandomValues(bytes);
    const raw=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
    return "MJ-"+raw.slice(0,4)+"-"+raw.slice(4,8)+"-"+raw.slice(8,12)+"-"+raw.slice(12,16);
  }
  async function deleteOrder(order) {
    if (!confirm("Hapus pesanan "+order.client_name+" beserta tokennya? Client tidak akan bisa melihat progres lagi.")) return;
    const {error}=await db.from("joki_progress").delete().eq("id",order.id);
    if (error) { showMessage("adminMessage","Gagal menghapus: "+error.message,"error"); return; }
    showMessage("adminMessage","Pesanan dan token berhasil dihapus.","success"); await loadOrders();
  }
  $("refreshOrders").addEventListener("click",loadOrders);
  db.auth.onAuthStateChange(() => { setTimeout(()=>{ if (!$("adminLoginForm").classList.contains("hidden")) return; checkAdmin(); },0); });
  checkAdmin().catch(console.error);
})();