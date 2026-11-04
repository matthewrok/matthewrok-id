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
    const cell=document.createElement("div"); cell.className="order-detail-cell";
    const l=document.createElement("span"); l.textContent=label;
    const v=document.createElement("strong"); v.textContent=escapeText(value);
    cell.append(l,v); grid.appendChild(cell);
  }
  function renderOrder(order, history=[]) {
    const card=document.createElement("article"); card.className="your-order-card";
    const head=document.createElement("div"); head.className="your-order-card-head";
    const titleWrap=document.createElement("div");
    const title=document.createElement("h3"); title.className="your-order-service"; title.textContent=order.service_name||"Layanan Joki";
    const created=document.createElement("div"); created.className="your-order-date"; created.textContent="Dibuat "+date(order.created_at);
    titleWrap.append(title,created);
    const status=document.createElement("span"); status.className="your-order-status"; status.textContent=order.status||"Menunggu";
    head.append(titleWrap,status); card.appendChild(head);

    const codeRow=document.createElement("div"); codeRow.className="your-order-code-row";
    const codeWrap=document.createElement("div"); const label=document.createElement("span"); label.className="your-order-code-label"; label.textContent="KODE PESANAN";
    const code=document.createElement("strong"); code.className="your-order-code"; code.textContent=order.order_number||"Belum tersedia"; codeWrap.append(label,code);
    const copy=document.createElement("button"); copy.type="button"; copy.className="copy-order-code"; copy.textContent="⧉ Salin kode"; copy.addEventListener("click",()=>copyText(order.order_number||"",copy));
    codeRow.append(codeWrap,copy); card.appendChild(codeRow);

    const total=document.createElement("div"); total.className="your-order-total-row";
    const totalLabel=document.createElement("span"); totalLabel.textContent="Total pesanan";
    const amount=document.createElement("strong"); amount.textContent=money(order.total_price); total.append(totalLabel,amount); card.appendChild(total);
    const progress=document.createElement("div"); progress.className="your-order-progress";
    const bar=document.createElement("span"); bar.style.width=Math.max(0,Math.min(100,Number(order.progress_percent)||0))+"%"; progress.appendChild(bar); card.appendChild(progress);

    const actions=document.createElement("div"); actions.className="your-order-actions";
    const detailButton=document.createElement("button"); detailButton.type="button"; detailButton.className="order-detail-toggle"; detailButton.textContent="⌄ Lihat rincian";
    const details=document.createElement("section"); details.className="order-details"; details.hidden=true;
    const grid=document.createElement("div"); grid.className="order-details-grid";
    addDetail(grid,"Kode pesanan",order.order_number||"—");
    addDetail(grid,"Nama client",order.client_name||"—");
    addDetail(grid,"Email akun",order.client_email||"—");
    addDetail(grid,"Paket layanan",order.service_name||"—");
    addDetail(grid,"Kingdom",order.kingdom_number||"—");
    addDetail(grid,"Jumlah karakter",Number(order.quantity||0)+" karakter");
    addDetail(grid,"Harga per karakter",money(order.unit_price));
    addDetail(grid,"Subtotal",money(order.subtotal_price ?? order.total_price));
    addDetail(grid,"Voucher",order.voucher_code||"Tidak digunakan");
    addDetail(grid,"Diskon voucher",money(order.discount_amount));
    addDetail(grid,"Total akhir",money(order.total_price));
    addDetail(grid,"Status",order.status||"Menunggu");
    addDetail(grid,"Progress",Math.max(0,Math.min(100,Number(order.progress_percent)||0))+"%");
    addDetail(grid,"Dibuat pada",date(order.created_at));
    addDetail(grid,"Pembaruan terakhir",date(order.updated_at));
    details.appendChild(grid);
    const note=document.createElement("p"); note.className="order-detail-note"; note.textContent="Catatan admin: "+(order.progress_note||"Belum ada catatan dari admin."); details.appendChild(note);
    const copyDetails=document.createElement("button"); copyDetails.type="button"; copyDetails.className="copy-order-code"; copyDetails.textContent="⧉ Salin detail pesanan";
    copyDetails.addEventListener("click",()=>copyText([
      "DETAIL PESANAN MATTHEW JOKI","Kode: "+(order.order_number||"—"),"Nama: "+(order.client_name||"—"),"Email: "+(order.client_email||"—"),"Paket: "+(order.service_name||"—"),"Kingdom: "+(order.kingdom_number||"—"),"Jumlah karakter: "+(order.quantity||0),"Harga per karakter: "+money(order.unit_price),"Subtotal: "+money(order.subtotal_price??order.total_price),"Voucher: "+(order.voucher_code||"Tidak digunakan"),"Diskon: "+money(order.discount_amount),"Total: "+money(order.total_price),"Status: "+(order.status||"Menunggu"),"Progress: "+(Number(order.progress_percent)||0)+"%","Dibuat: "+date(order.created_at),"Update: "+date(order.updated_at),"Catatan admin: "+(order.progress_note||"Belum ada catatan")
    ].join("\n"),copyDetails));
    details.appendChild(copyDetails);
    detailButton.setAttribute("aria-expanded","false");
    detailButton.addEventListener("click",()=>{const isOpen=!details.hidden;details.hidden=isOpen;detailButton.textContent=isOpen?"⌄ Lihat rincian":"⌃ Sembunyikan rincian";detailButton.setAttribute("aria-expanded",String(!isOpen));});
    actions.appendChild(detailButton);
    const tracker=document.createElement("a"); tracker.href="/joki-matthew.html"; tracker.className="order-detail-toggle"; tracker.textContent="♛ Lacak progress"; tracker.style.textDecoration="none"; actions.appendChild(tracker);
    card.append(actions,details); return card;
  }
  async function loadOrders() {
    if (loadingOrders) return;
    loadingOrders = true;
    const list=$("ordersList"); list.replaceChildren();
    if(!db){setState("Layanan pesanan belum siap. Muat ulang halaman.","error");loadingOrders=false;return;}
    const button=$("refreshOrders"); button.disabled=true;
    try {
      const {data:{user},error:authError}=await db.auth.getUser();
      if(authError) throw authError;
      if(!user){setState("Silakan login menggunakan akun member untuk melihat pesanan.","error");const box=document.createElement("div");box.className="order-empty";const title=document.createElement("strong");title.textContent="Login diperlukan";const p=document.createElement("p");p.textContent="Masuk ke akun yang digunakan saat membuat pesanan, lalu buka kembali halaman Your Order.";const link=document.createElement("a");link.href="/login.html";link.className="order-detail-toggle";link.textContent="Login / Daftar";box.append(title,p,link);list.appendChild(box);return;}
      setState("Memuat pesanan milik akun ini…");
      const {data,error}=await db.rpc("list_my_joki_orders");
      if(error) throw error;
      const orders=Array.isArray(data)?data:[];
      let history=[];
      try { const result=await db.rpc("list_my_joki_order_history"); if(!result.error && Array.isArray(result.data)) history=result.data; }
      catch(historyError) { console.warn("[Your Order] Riwayat belum tersedia:",historyError); }
      if(!orders.length){setState("Belum ada pesanan yang terhubung dengan email akun ini.");const box=document.createElement("div");box.className="order-empty";const title=document.createElement("strong");title.textContent="Belum ada pesanan";const p=document.createElement("p");p.textContent="Pesanan baru akan muncul di sini setelah dibuat menggunakan akun ini.";const link=document.createElement("a");link.href="/index.html";link.className="order-detail-toggle";link.textContent="Lihat paket joki";box.append(title,p,link);list.appendChild(box);return;}
      orders.forEach(order=>list.appendChild(renderOrder(order,history.filter(item=>item.order_id===order.id))));
      setState("Ditemukan "+orders.length+" pesanan untuk akun "+(user.email||"ini")+".","success");
    } catch(error) {
      console.error("[Your Order]",error);
      setState("Pesanan belum dapat dimuat. Pastikan kamu login dan fungsi list_my_joki_orders tersedia di database. "+(error.message||""),"error");
    } finally {button.disabled=false;loadingOrders=false;}
  }
  $("refreshOrders")?.addEventListener("click",loadOrders);
  window.setInterval(() => { if (!document.hidden) loadOrders(); }, 45000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loadOrders(); });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",loadOrders,{once:true});else loadOrders();
})();