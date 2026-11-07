(() => {
  "use strict";
  const db = window.supabaseClient;
  const $ = id => document.getElementById(id);
  const money = value => "Rp" + Number(value || 0).toLocaleString("id-ID");
  const date = value => value ? new Date(value).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"}) : "—";
  const escapeText = value => String(value ?? "");
  let loadingOrders = false;
  function setState(message, type="") {
    const el=$("ordersState"); el.textContent=message; el.className="feature-state"+(type?" "+type:"");
  }
  async function copyText(value, button) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const area=document.createElement("textarea"); area.value=value; area.style.position="fixed"; area.style.opacity="0"; document.body.appendChild(area); area.select();
        const ok=document.execCommand("copy"); area.remove(); if(!ok) throw new Error("Copy gagal");
      }
      const old=button.textContent; button.textContent="✓ Tersalin"; window.setTimeout(()=>button.textContent=old,1500);
    } catch (_) { setState("Tidak dapat menyalin otomatis. Tekan lama kode pesanan untuk menyalinnya.","error"); }
  }
  function addDetail(grid,label,value) {
    const cell=document.createElement("div"); cell.className="detail-item";
    const l=document.createElement("span"); l.textContent=label;
    const v=document.createElement("strong"); v.textContent=escapeText(value);
    cell.append(l,v); grid.appendChild(cell);
  }
  function normalizedStatus(order) {
    return String(order.status || "Menunggu").trim().toLowerCase();
  }
  function isCompleted(order) {
    const status=normalizedStatus(order);
    return status==="selesai" || status==="completed" || status==="complete";
  }
  function isInProcess(order) { return !isCompleted(order); }
  function renderOrder(order, history=[]) {
    const card=document.createElement("article"); card.className="order-card";
    const statusText=String(order.status || "Menunggu");
    const completed=isCompleted(order);
    const inProgress=normalizedStatus(order)==="proses";
    const progressValue=Math.max(0,Math.min(100,Number(order.progress_percent)||0));

    const head=document.createElement("div"); head.className="card-header";
    const title=document.createElement("div");
    const heading=document.createElement("h3"); heading.textContent=order.service_name||"Layanan Joki";
    const created=document.createElement("p"); created.className="your-order-date"; created.textContent="Dibuat "+date(order.created_at);
    title.append(heading,created);
    const badges=document.createElement("div"); badges.className="badge-group";
    const status=document.createElement("span"); status.className="status-badge "+(completed?"status-success":"status-process"); status.textContent=statusText;
    const payment=document.createElement("span"); payment.className="payment-badge";
    const paid=Boolean(order.is_paid || order.payment_status==="paid" || order.payment_status==="lunas" || order.payment_status==="Lunas");
    payment.classList.add(paid?"payment-lunas":"payment-unpaid");
    payment.textContent=paid?"Pembayaran Lunas":(order.payment_status||"Menunggu pembayaran");
    badges.append(status,payment); head.append(title,badges); card.appendChild(head);

    if(inProgress) {
      const progressWrap=document.createElement("div"); progressWrap.className="mini-progress-wrap";
      const meta=document.createElement("div"); meta.className="mini-progress-meta";
      const label=document.createElement("span"); label.textContent="PROGRESS PESANAN";
      const percent=document.createElement("strong"); percent.textContent=progressValue+"%";
      meta.append(label,percent);
      const track=document.createElement("div"); track.className="mini-progress-track";
      const fill=document.createElement("div"); fill.className="mini-progress-fill"; fill.style.width=progressValue+"%";
      fill.setAttribute("role","progressbar"); fill.setAttribute("aria-valuemin","0"); fill.setAttribute("aria-valuemax","100"); fill.setAttribute("aria-valuenow",String(progressValue)); fill.setAttribute("aria-label","Progress pesanan");
      track.appendChild(fill); progressWrap.append(meta,track); card.appendChild(progressWrap);
    }

    const body=document.createElement("div"); body.className="card-body";
    const grid=document.createElement("div"); grid.className="details-grid";
    addDetail(grid,"Kode Pesanan",order.order_number||"—");
    addDetail(grid,"Kingdom",order.kingdom_number||"—");
    addDetail(grid,"Jumlah Karakter",Number(order.quantity||0)+" karakter");
    addDetail(grid,"Tanggal Pesanan",date(order.created_at));
    body.appendChild(grid);

    const footer=document.createElement("div"); footer.className="card-footer";
    const price=document.createElement("div");
    const priceLabel=document.createElement("span"); priceLabel.className="price-label"; priceLabel.textContent="Total Pembayaran";
    const priceValue=document.createElement("strong"); priceValue.className="price-value"; priceValue.textContent=money(order.total_price);
    price.append(priceLabel,priceValue);
    const actions=document.createElement("div"); actions.className="action-buttons";
    const invoice=document.createElement("button"); invoice.type="button"; invoice.className="btn-action"; invoice.textContent="Invoice";
    invoice.addEventListener("click",()=>{
      if(order.invoice_url) window.open(order.invoice_url,"_blank","noopener,noreferrer");
      else {
        const detailText=["INVOICE MATTHEW JOKI","Kode: "+(order.order_number||"—"),"Paket: "+(order.service_name||"—"),"Kingdom: "+(order.kingdom_number||"—"),"Jumlah karakter: "+(order.quantity||0),"Total: "+money(order.total_price),"Status: "+statusText,"Dibuat: "+date(order.created_at)].join("\\n");
        copyText(detailText,invoice);
      }
    });
    actions.appendChild(invoice);
    if(completed) {
      const reorder=document.createElement("a"); reorder.href="/index.html"; reorder.className="btn-action primary"; reorder.textContent="Pesan Lagi"; actions.appendChild(reorder);
    } else {
      const tracker=document.createElement("a"); tracker.href="/joki-matthew.html"; tracker.className="btn-action primary"; tracker.textContent="Lacak"; actions.appendChild(tracker);
    }
    footer.append(price,actions); body.appendChild(footer); card.appendChild(body);

    const details=document.createElement("section"); details.className="order-details"; details.hidden=true;
    const detailGrid=document.createElement("div"); detailGrid.className="details-grid";
    addDetail(detailGrid,"Nama Client",order.client_name||"—");
    addDetail(detailGrid,"Email Akun",order.client_email||"—");
    addDetail(detailGrid,"Paket Layanan",order.service_name||"—");
    addDetail(detailGrid,"Harga per Karakter",money(order.unit_price));
    addDetail(detailGrid,"Subtotal",money(order.subtotal_price??order.total_price));
    addDetail(detailGrid,"Voucher",order.voucher_code||"Tidak digunakan");
    addDetail(detailGrid,"Diskon",money(order.discount_amount));
    addDetail(detailGrid,"Pembaruan Terakhir",date(order.updated_at));
    details.appendChild(detailGrid);
    const note=document.createElement("p"); note.textContent="Catatan admin: "+(order.progress_note||"Belum ada catatan dari admin."); details.appendChild(note);
    const toggle=document.createElement("button"); toggle.type="button"; toggle.className="btn-action"; toggle.textContent="Lihat Rincian";
    toggle.setAttribute("aria-expanded","false");
    toggle.addEventListener("click",()=>{details.hidden=!details.hidden;toggle.textContent=details.hidden?"Lihat Rincian":"Tutup Rincian";toggle.setAttribute("aria-expanded",String(!details.hidden));});
    body.appendChild(toggle); card.appendChild(details);
    return card;
  }
  let allOrders=[];
  let activeFilter="all";
  function applyFilter() {
    const list=$("ordersList"), empty=$("emptyState");
    const visible=allOrders.filter(order=>activeFilter==="all" || (activeFilter==="success"?isCompleted(order):isInProcess(order)));
    list.replaceChildren(...visible.map(order=>renderOrder(order)));
    list.style.display=visible.length?"flex":"none";
    if(empty) {
      empty.classList.toggle("show",allOrders.length===0 || visible.length===0);
      const heading=empty.querySelector("h3"), paragraph=empty.querySelector("p"), link=empty.querySelector("a");
      if(heading) heading.textContent=allOrders.length===0?"Belum Ada Pesanan":"Tidak Ada Pesanan";
      if(paragraph) paragraph.textContent=allOrders.length===0?"Kamu belum pernah melakukan pemesanan joki.":"Tidak ada pesanan yang cocok dengan filter ini.";
      if(link) link.textContent=allOrders.length===0?"Mulai Pesan Sekarang":"Lihat Semua Pesanan";
      if(link && allOrders.length>0) link.onclick=(event)=>{event.preventDefault();setActiveFilter("all");};
    }
  }
  function setActiveFilter(filter) {
    activeFilter=filter;
    document.querySelectorAll(".filter-btn").forEach(button=>{
      const active=button.dataset.filter===filter;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",String(active));
    });
    applyFilter();
  }
  document.querySelectorAll(".filter-btn").forEach(button=>button.addEventListener("click",()=>setActiveFilter(button.dataset.filter||"all")));

  async function loadOrders() {
    if (loadingOrders) return;
    loadingOrders=true;
    const list=$("ordersList");
    if(!db){setState("Layanan pesanan belum siap. Muat ulang halaman.","error");loadingOrders=false;return;}
    const button=$("refreshOrders"); if(button) button.disabled=true;
    try {
      const {data:{user},error:authError}=await db.auth.getUser();
      if(authError) throw authError;
      if(!user) {
        allOrders=[]; list.replaceChildren(); list.style.display="flex";
        const empty=$("emptyState"); if(empty) empty.classList.remove("show");
        setState("Silakan login menggunakan akun member untuk melihat pesanan.","error");
        const box=document.createElement("div"); box.className="order-card card-body";
        const title=document.createElement("strong"); title.textContent="Login diperlukan";
        const p=document.createElement("p"); p.textContent="Masuk ke akun yang digunakan saat membuat pesanan, lalu buka kembali halaman Your Order.";
        const link=document.createElement("a"); link.href="/login.html"; link.className="btn-action primary"; link.textContent="Login / Daftar";
        box.append(title,p,link); list.appendChild(box); return;
      }
      setState("Memuat pesanan milik akun ini…");
      const {data,error}=await db.rpc("list_my_joki_orders");
      if(error) throw error;
      allOrders=Array.isArray(data)?data:[];
      try { const result=await db.rpc("list_my_joki_order_history"); if(result.error) console.warn("[Your Order] Riwayat belum tersedia:",result.error); }
      catch(historyError) { console.warn("[Your Order] Riwayat belum tersedia:",historyError); }
      setActiveFilter(activeFilter);
      if(!allOrders.length) setState("Belum ada pesanan yang terhubung dengan email akun ini.");
      else setState("Ditemukan "+allOrders.length+" pesanan untuk akun "+(user.email||"ini")+".","success");
    } catch(error) {
      console.error("[Your Order]",error);
      setState("Pesanan belum dapat dimuat. Pastikan kamu login dan fungsi list_my_joki_orders tersedia di database. "+(error.message||""),"error");
    } finally {if(button) button.disabled=false;loadingOrders=false;}
  }
  $("refreshOrders")?.addEventListener("click",loadOrders);
  window.setInterval(() => { if (!document.hidden) loadOrders(); }, 45000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loadOrders(); });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",loadOrders,{once:true});else loadOrders();
})();