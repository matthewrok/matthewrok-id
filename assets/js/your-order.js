(() => {
  "use strict";
  const db = window.supabaseClient;
  const $ = id => document.getElementById(id);
  const money = value => "Rp" + Number(value || 0).toLocaleString("id-ID");
  const date = value => value ? new Date(value).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"}) : "—";
  const escapeText = value => String(value ?? "");
  const actionIcon = name => ({invoice:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/></svg>',track:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M10.5 7v4l3 2"/></svg>',reorder:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/><path d="m17 15 3 2-3 2"/></svg>',details:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>'})[name] || "";
  function loadExternalScript(src, globalName) {
    if (window[globalName]) return Promise.resolve();
    const existing=document.querySelector('script[data-invoice-lib="'+globalName+'"]');
    if(existing) return new Promise((resolve,reject)=>{existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true});});
    return new Promise((resolve,reject)=>{
      const script=document.createElement("script"); script.src=src; script.async=true; script.dataset.invoiceLib=globalName;
      script.onload=resolve; script.onerror=()=>reject(new Error("Gagal memuat pustaka PDF")); document.head.appendChild(script);
    });
  }
  const invoiceEscape=value=>String(value??"—").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  async function waitForInvoiceLogo(image) {
    if (!image) throw new Error("Elemen logo invoice tidak ditemukan.");
    if (!image.complete) {
      await new Promise((resolve,reject)=>{
        const timeout=window.setTimeout(()=>reject(new Error("Waktu pemuatan logo Matthew habis.")),15000);
        image.addEventListener("load",()=>{window.clearTimeout(timeout);resolve();},{once:true});
        image.addEventListener("error",()=>{window.clearTimeout(timeout);reject(new Error("Logo Matthew gagal dimuat."));},{once:true});
      });
    }
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("File logo-matthew.png tidak dapat dibaca.");
    if (typeof image.decode==="function") await image.decode();
  }
  async function downloadInvoicePdf(order) {
    await Promise.all([
      loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js","html2canvas"),
      loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js","jspdf")
    ]);
    const issuedAt=new Date();
    const amount=value=>"Rp"+Number(value||0).toLocaleString("id-ID");
    const subtotal=order.subtotal_price??order.total_price??0;
    const discount=Number(order.discount_amount||0);
    const root=document.createElement("div");
    root.style.cssText="position:fixed;left:-10000px;top:0;width:794px;z-index:-1;";
    root.innerHTML=`
      <article style="width:794px;padding:54px 58px;background:#050505;color:#f3f4f6;font-family:Inter,Arial,sans-serif;border:1px solid #262626;box-sizing:border-box;">
        <header style="display:flex;align-items:center;gap:20px;padding-bottom:28px;border-bottom:1px solid #d4af37;">
          <img id="invoiceBrandLogo" src="${new URL('/assets/images/brand/logo-matthew.png',window.location.origin).href}" alt="Logo Matthew" width="88" height="88" decoding="async" style="display:block;width:88px;height:88px;object-fit:contain;flex:0 0 88px;">
          <div style="flex:1">
            <div style="font:700 13px Inter,Arial,sans-serif;letter-spacing:3px;color:#d4af37;">MATTHEW.RMN · TRUSTED ROK SERVICE</div>
            <h1 style="font:700 31px Cinzel,Georgia,serif;letter-spacing:2px;margin:8px 0 4px;color:#fff;">MATTHEW JOKI</h1>
            <div style="font:600 12px Inter,Arial,sans-serif;letter-spacing:2px;color:#a3a3a3;">INVOICE PESANAN</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:#9ca3af;">NOMOR INVOICE</div>
            <div style="font-size:14px;font-weight:700;color:#d4af37;margin-top:5px;">${invoiceEscape(order.order_number)}</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:10px;">${invoiceEscape(issuedAt.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"}))}</div>
          </div>
        </header>
        <section style="padding:25px 0 20px;display:flex;justify-content:space-between;gap:30px;">
          <div><div style="font-size:10px;letter-spacing:1.5px;color:#d4af37;margin-bottom:9px;">DITAGIHKAN KEPADA</div>
            <div style="font-size:17px;font-weight:700;color:#fff;">${invoiceEscape(order.client_name||"Member MATTHEW")}</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:5px;">${invoiceEscape(order.client_email||"—")}</div>
          </div>
          <div style="text-align:right"><div style="font-size:10px;letter-spacing:1.5px;color:#d4af37;margin-bottom:9px;">INFORMASI PESANAN</div>
            <div style="font-size:12px;color:#d1d5db;">Tanggal dibuat: ${invoiceEscape(date(order.created_at))}</div>
            <div style="font-size:12px;color:#d1d5db;margin-top:5px;">Kingdom: <b style="color:#fff;">${invoiceEscape(order.kingdom_number||"—")}</b></div>
          </div>
        </section>
        <div style="background:#101010;border:1px solid #292929;border-radius:8px;padding:18px 20px;margin-bottom:22px;">
          <div style="font-size:10px;letter-spacing:1.5px;color:#d4af37;margin-bottom:8px;">DETAIL LAYANAN</div>
          <div style="font:700 18px Cinzel,Georgia,serif;color:#fff;">${invoiceEscape(order.service_name||"Layanan Joki")}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:7px;">Jumlah karakter: ${invoiceEscape(order.quantity??"—")} karakter</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <tbody>
            <tr><td style="padding:12px 4px;color:#9ca3af;border-bottom:1px solid #292929;">Harga per karakter</td><td style="padding:12px 4px;text-align:right;color:#f3f4f6;border-bottom:1px solid #292929;">${amount(order.unit_price)}</td></tr>
            <tr><td style="padding:12px 4px;color:#9ca3af;border-bottom:1px solid #292929;">Subtotal</td><td style="padding:12px 4px;text-align:right;color:#f3f4f6;border-bottom:1px solid #292929;">${amount(subtotal)}</td></tr>
            <tr><td style="padding:12px 4px;color:#9ca3af;border-bottom:1px solid #292929;">Kode voucher</td><td style="padding:12px 4px;text-align:right;color:#f3f4f6;border-bottom:1px solid #292929;">${invoiceEscape(order.voucher_code||"Tidak digunakan")}</td></tr>
            <tr><td style="padding:12px 4px;color:#9ca3af;border-bottom:1px solid #292929;">Diskon</td><td style="padding:12px 4px;text-align:right;color:#d4af37;border-bottom:1px solid #292929;">− ${amount(discount)}</td></tr>
          </tbody>
        </table>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:20px;background:#17140b;border:1px solid #6b5520;border-radius:8px;margin-top:18px;">
          <div><div style="font-size:10px;letter-spacing:1.5px;color:#d4af37;">TOTAL PEMBAYARAN</div><div style="font-size:10px;color:#9ca3af;margin-top:5px;">Sudah termasuk potongan voucher (jika ada)</div></div>
          <div style="font:700 24px Cinzel,Georgia,serif;color:#e5c45a;">${amount(order.total_price)}</div>
        </div>
        <section style="display:flex;gap:14px;margin-top:20px;">
          <div style="flex:1;padding:14px 16px;background:#101010;border:1px solid #292929;border-radius:7px;">
            <div style="font-size:9px;letter-spacing:1px;color:#9ca3af;">STATUS PESANAN</div><div style="font-size:13px;font-weight:700;color:#fff;margin-top:6px;">${invoiceEscape(order.status||"Menunggu")}</div>
          </div>
          <div style="flex:1;padding:14px 16px;background:#101010;border:1px solid #292929;border-radius:7px;">
            <div style="font-size:9px;letter-spacing:1px;color:#9ca3af;">PROGRES PEKERJAAN</div><div style="font-size:13px;font-weight:700;color:#d4af37;margin-top:6px;">${invoiceEscape(order.progress_percent??0)}%</div>
          </div>
        </section>
        <section style="margin-top:20px;padding:15px 17px;background:#101010;border-left:3px solid #d4af37;">
          <div style="font-size:9px;letter-spacing:1px;color:#d4af37;margin-bottom:7px;">CATATAN ADMIN</div>
          <div style="font-size:11px;line-height:1.6;color:#d1d5db;">${invoiceEscape(order.progress_note||"Belum ada catatan dari admin.")}</div>
        </section>
        <footer style="margin-top:34px;padding-top:16px;border-top:1px solid #292929;text-align:center;">
          <div style="font:700 14px Cinzel,Georgia,serif;letter-spacing:2px;color:#d4af37;">MATTHEW JOKI</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:6px;">Terima kasih telah mempercayakan layanan Rise of Kingdoms kepada kami.</div>
          <div style="font-size:9px;color:#666;margin-top:12px;">Dokumen ini dibuat secara otomatis oleh sistem MATTHEW JOKI · ${invoiceEscape(issuedAt.toLocaleString("id-ID"))}</div>
        </footer>
      </article>`;
    document.body.appendChild(root);
    try {
      await document.fonts.ready;
      const logo=root.querySelector("#invoiceBrandLogo");
      await waitForInvoiceLogo(logo);
      const canvas=await window.html2canvas(root,{scale:2,backgroundColor:"#050505",useCORS:true,logging:false,width:794,windowWidth:794});
      const image=canvas.toDataURL("image/jpeg",0.96);
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
      const pageWidth=210,pageHeight=297,margin=8;
      const ratio=Math.min((pageWidth-margin*2)/(canvas.width/2),(pageHeight-margin*2)/(canvas.height/2));
      const width=(canvas.width/2)*ratio,height=(canvas.height/2)*ratio;
      pdf.setFillColor(5,5,5); pdf.rect(0,0,pageWidth,pageHeight,"F");
      pdf.addImage(image,"JPEG",(pageWidth-width)/2,(pageHeight-height)/2,width,height,undefined,"FAST");
      pdf.save("Invoice-"+String(order.order_number||"MATTHEW").replace(/[^a-zA-Z0-9_-]/g,"-")+".pdf");
    } finally { root.remove(); }
  }
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
  function isInProcess(order) { const status=normalizedStatus(order); return !isCompleted(order) && !["dibatalkan","cancelled","canceled","cancel"].includes(status); }
  function renderOrder(order) {
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
    invoice.addEventListener("click",async()=>{
      const originalText=invoice.textContent;
      invoice.disabled=true; invoice.textContent="Membuat PDF…";
      try { await downloadInvoicePdf(order); }
      catch(error) {
        console.error("[Your Order] Invoice PDF:",error);
        setState("Invoice PDF belum dapat dibuat. Periksa koneksi lalu coba kembali.", "error");
      } finally { invoice.disabled=false; invoice.textContent=originalText; }
    });
    actions.appendChild(invoice);
    const tracker=document.createElement("button");
    tracker.type="button"; tracker.className="btn-action primary"; tracker.textContent="Lacak";
    tracker.addEventListener("click",async()=>{
      const originalText=tracker.textContent;
      tracker.disabled=true; tracker.textContent="Menyiapkan token…";
      try {
        const {data,error}=await db.rpc("get_my_joki_tracking_token",{p_order_number:order.order_number});
        if(error) throw error;
        const token=typeof data==="string"?data:null;
        if(!token) throw new Error("Token belum tersedia untuk pesanan ini. Hubungi admin untuk bantuan.");
        sessionStorage.setItem("matthewProgressToken",token);
        window.location.assign("/joki-matthew.html");
      } catch(error) {
        console.error("[Your Order] Token recovery:",error);
        setState(error.message||"Token pelacakan belum dapat dipulihkan. Pastikan kamu login dengan akun pemilik pesanan.","error");
        tracker.disabled=false; tracker.textContent=originalText;
      }
    });
    actions.appendChild(tracker);
    if(completed) {
      const reorder=document.createElement("a");
      const service=String(order.service_name||"").toLowerCase();
      const productCode=service.includes("17")?"ch17":service.includes("13")?"ch13":service.includes("11")?"ch11":null;
      reorder.href=productCode?"/?order="+productCode+"#produk-joki":"/#produk-joki";
      reorder.className="btn-action"; reorder.textContent="Pesan Lagi"; actions.appendChild(reorder);
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
    const note=document.createElement("p"); note.className="admin-note";
    const noteLabel=document.createElement("strong"); noteLabel.textContent="Catatan admin";
    const noteText=document.createElement("span"); noteText.textContent=order.progress_note||"Belum ada catatan dari admin.";
    note.append(noteLabel,noteText); details.appendChild(note);
    const toggle=document.createElement("button"); toggle.type="button"; toggle.className="btn-action details-toggle"; toggle.textContent="Lihat Rincian";
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