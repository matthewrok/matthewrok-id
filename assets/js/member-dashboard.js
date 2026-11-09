// This script is placed at the end of body; initialize immediately. Do not wait for DOMContentLoaded,
// because DOMContentLoaded also waits for deferred UI/maintenance scripts and can leave this loader stuck.
(async () => {
 const client=window.supabaseClient;
 const state=document.getElementById("loadState");
 const content=document.getElementById("dashboardContent");
 const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
 const roles=["warga_biasa","warga_tidak_biasa","warga_sultan","admin"];
 let stage="Menyiapkan koneksi akun";
 const showError=(title,detail)=>{
  state.hidden=false;content.hidden=true;
  state.innerHTML='<span class="loading-spinner" aria-hidden="true" style="animation:none;border-top-color:#ffb86b"></span><span class="loading-copy"><strong>'+escapeHtml(title)+'</strong><small>'+escapeHtml(detail)+'</small></span>';
  const retry=document.createElement("button");retry.type="button";retry.textContent="COBA LAGI";
  retry.style.cssText="display:block;margin-top:12px;padding:10px 14px;border-radius:8px;border:1px solid #5798e8;background:#12345d;color:#fff;cursor:pointer";
  retry.addEventListener("click",()=>location.reload());state.appendChild(retry);
 };
 const timeout=(promise,label,ms=12000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+" timeout setelah "+Math.round(ms/1000)+" detik")),ms))]);
 const setStage=(text)=>{stage=text;const strong=state.querySelector("strong");if(strong)strong.textContent=text;};
 if(!client?.auth){showError("Koneksi akun tidak tersedia","Library Supabase gagal dimuat. Periksa koneksi lalu muat ulang.");return;}
 try {
  setStage("Memeriksa sesi login...");
  const sessionResult=await timeout(client.auth.getSession(),"Pemeriksaan sesi");
  const session=sessionResult?.data?.session;
  if(sessionResult.error||!session){location.replace("/login.html?next=member-dashboard.html");return;}
  setStage("Memverifikasi akun...");
  const userResult=await timeout(client.auth.getUser(),"Verifikasi identitas");
  const user=userResult?.data?.user;
  if(userResult.error||!user||!user.email_confirmed_at){location.replace("/login.html?next=member-dashboard.html");return;}
  setStage("Memeriksa status keanggotaan...");
  const profileResult=await timeout(client.from("profiles").select("full_name,role,account_status,created_at").eq("id",user.id).maybeSingle(),"Pengambilan profil");
  if(profileResult.error)throw new Error("Profil: "+profileResult.error.message);
  const profile=profileResult.data;
  if(!profile){throw new Error("Profil akun tidak ditemukan. Hubungi admin MATTHEW JOKI.");}
  if(String(profile.account_status||"").trim().toLowerCase()!=="active"){await client.auth.signOut({scope:"local"});location.replace("/login.html?reason=account-status");return;}
  if(!roles.includes(String(profile.role||"").trim().toLowerCase())){location.replace("/index.html?access=denied");return;}
  setStage("Mengambil data pesanan...");
  const orderResult=await timeout(client.rpc("list_my_joki_orders"),"Pengambilan pesanan");
  if(orderResult.error)throw new Error("Pesanan: "+orderResult.error.message);
  const orders=orderResult.data;
  const list=Array.isArray(orders)?orders:[];
  const done=list.filter(o=>o.status==="Selesai").length;
  const cancelled=list.filter(o=>o.status==="Dibatalkan").length;
  const active=list.filter(o=>!["Selesai","Dibatalkan","Ditunda"].includes(o.status)).length;
  const isAdmin=String(profile.role||"").trim().toLowerCase()==="admin";
  const levels=[{name:"WARGA BIASA",min:0,next:7},{name:"WARGA TIDAK BIASA",min:7,next:19},{name:"WARGA SULTAN",min:19,next:null}];
  const level=isAdmin?{name:"ADMIN",min:0,next:null}:[...levels].reverse().find(x=>done>=x.min)||levels[0],next=isAdmin?null:levels.find(x=>x.min===level.next);
  document.getElementById("memberName").textContent=profile.full_name||user.email.split("@")[0];
  document.getElementById("totalOrders").textContent=list.length;
  document.getElementById("completedOrders").textContent=done;
  document.getElementById("activeOrders").textContent=active;
  document.getElementById("cancelledOrders").textContent=cancelled;
  document.getElementById("totalSpent").textContent=money(list.reduce((sum,o)=>sum+Number(o.total_price||0),0));
  document.getElementById("profileName").textContent=profile.full_name||"Belum diatur";
  document.getElementById("profileEmail").textContent=user.email||"—";
  document.getElementById("profileRole").textContent=profile.role||"MEMBER";
  document.getElementById("profileJoined").textContent=profile.created_at?new Date(profile.created_at).toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"}):"—";
  document.getElementById("memberLevel").textContent=level.name;
  document.getElementById("levelDescription").textContent="Level "+level.name+" · dihitung dari jumlah pesanan berstatus Selesai.";
  document.getElementById("levelBar").style.width=(next?Math.min(100,Math.round((done-level.min)/(next.min-level.min)*100)):100)+"%";
  document.getElementById("nextLevel").textContent=next?"Selesaikan "+Math.max(0,next.min-done)+" pesanan lagi untuk mencapai "+next.name+".":"Level tertinggi telah tercapai.";
  const recent=document.getElementById("recentOrders");
  recent.innerHTML=list.length?list.slice(0,5).map(o=>'<div class="member-order"><div><strong>'+escapeHtml(o.service_name||"Layanan")+'</strong><small>'+escapeHtml(o.order_number||"—")+' · Kingdom '+escapeHtml(o.kingdom_number||"—")+' · '+escapeHtml(o.status||"Menunggu")+' · '+money(o.total_price)+'</small></div><button type="button" data-invoice="'+escapeHtml(o.id)+'">INVOICE</button></div>').join(""):'<div class="member-empty">Belum ada pesanan.</div>';
  document.getElementById("notifications").innerHTML=list.length?list.slice().sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at)).slice(0,4).map(o=>'<div class="member-note"><strong>'+escapeHtml(o.order_number||"Pesanan")+' · '+escapeHtml(o.status||"Menunggu")+'</strong>'+escapeHtml(o.progress_note||("Status pesanan diperbarui. Progres "+(o.progress_percent||0)+"%."))+'<br><small>'+new Date(o.updated_at||o.created_at).toLocaleString("id-ID")+'</small></div>').join(""):'Belum ada pembaruan pesanan.';
  const reviewArea=document.getElementById("reviewArea");
  reviewArea.textContent="Memeriksa riwayat ulasan...";
  state.hidden=true;content.hidden=false;
  const reviewResult=await timeout(client.rpc("get_my_reviewed_order_ids"),"Pemeriksaan ulasan",8000).catch(error=>({data:null,error}));
  if(reviewResult.error){reviewArea.textContent="Riwayat ulasan sementara tidak tersedia.";console.warn("[Member Dashboard] reviews",reviewResult.error);}
  else {
   const reviewed=new Set((reviewResult.data||[]).map(x=>x.order_id));
   const eligible=list.filter(o=>o.status==="Selesai"&&!reviewed.has(o.id));
   reviewArea.innerHTML=eligible.length?eligible.map(o=>'<form class="review-form" data-review-order="'+escapeHtml(o.id)+'" style="padding:14px 0;border-top:1px solid var(--line)"><strong>'+escapeHtml(o.service_name||"Layanan")+' · '+escapeHtml(o.order_number||"Pesanan")+'</strong><label style="display:block;margin:10px 0 5px;color:var(--muted)">Rating</label><select name="rating" required><option value="5">★★★★★ — Sangat puas</option><option value="4">★★★★ — Puas</option><option value="3">★★★ — Cukup</option><option value="2">★★ — Kurang</option><option value="1">★ — Tidak puas</option></select><textarea name="review" minlength="5" maxlength="700" required placeholder="Ceritakan pengalamanmu (5–700 karakter)..." style="display:block;width:100%;margin:10px 0;min-height:85px"></textarea><label style="display:flex;gap:8px;align-items:center;color:var(--muted);font-size:12px"><input type="checkbox" name="display_name"> Izinkan nama saya ditampilkan bersama ulasan</label><button type="submit" style="margin:12px 0 0">KIRIM ULASAN</button></form>').join(""):'<div class="member-empty">Belum ada pesanan selesai yang dapat diberi rating.</div>';
  }
  reviewArea.addEventListener("submit",async e=>{const form=e.target.closest("[data-review-order]");if(!form)return;e.preventDefault();const button=form.querySelector("button");button.disabled=true;const result=await client.rpc("submit_member_joki_review",{p_order_id:form.dataset.reviewOrder,p_rating:Number(form.rating.value),p_review_text:form.review.value.trim(),p_display_name:form.display_name.checked});if(result.error){alert("Ulasan belum dapat dikirim: "+result.error.message);button.disabled=false;}else{form.remove();alert("Ulasan berhasil dikirim.");}});
  recent.addEventListener("click",e=>{const btn=e.target.closest("[data-invoice]");if(!btn)return;const order=list.find(x=>x.id===btn.dataset.invoice);if(order)printInvoice(order,user.email);});
 } catch(error) {
  console.error("[Member Dashboard] "+stage,error);
  showError("Dashboard gagal dimuat",stage+": "+(error?.message||"Kesalahan tidak diketahui"));
 }
 function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 function printInvoice(o,email){
  const e=escapeHtml;
  const invoiceHtml='<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice '+e(o.order_number)+'</title><style>\n  *{box-sizing:border-box}body{font:14px/1.65 Arial,sans-serif;color:#17233d;background:#eef3ff;margin:0;padding:28px 16px}\n  .sheet{max-width:760px;margin:0 auto;background:#fff;border:1px solid #d9e4fa;border-radius:18px;padding:clamp(22px,5vw,48px);box-shadow:0 18px 55px #18315b18}\n  header{border-bottom:2px solid #3157df;padding-bottom:20px;margin-bottom:22px}h1{margin:0;color:#18346f;letter-spacing:2px;font-size:27px}\n  .eyebrow{color:#557cff;font-size:10px;font-weight:800;letter-spacing:2px}.code{font-size:16px;font-weight:800;color:#3157df}\n  .meta{color:#64748b;font-size:12px}.row{display:flex;justify-content:space-between;gap:18px;padding:12px 0;border-bottom:1px solid #e8edf7}.row span{color:#64748b}.row b{text-align:right;overflow-wrap:anywhere}\n  .total{font-size:19px;color:#18346f;border-bottom:0}.status{margin-top:22px;padding:14px;border-radius:12px;background:#eff5ff;color:#23447e}\n  .actions{display:flex;gap:10px;justify-content:center;margin:22px auto 0}.actions button{border:0;border-radius:9px;padding:12px 18px;background:#3157df;color:white;font-weight:700;cursor:pointer}.actions .back{background:#e8eefc;color:#23447e}\n  @media print{body{background:white;padding:0}.sheet{box-shadow:none;border:0;border-radius:0;max-width:none}.actions{display:none}}\n  </style></head><body><main class="sheet"><header><span class="eyebrow">MATTHEW.RMN · TRUSTED ROK SERVICE</span><h1>MATTHEW JOKI</h1><p><b>INVOICE PESANAN</b></p><div class="code">Kode: '+e(o.order_number)+'</div><small class="meta">Diterbitkan: '+new Date().toLocaleDateString("id-ID")+'</small></header>\n  <p>Nama: <b>'+e(o.client_name||"—")+'</b><br>Email: '+e(email||"—")+'</p>\n  <div class="row"><span>Kingdom</span><b>'+e(o.kingdom_number||"—")+'</b></div><div class="row"><span>Layanan</span><b>'+e(o.service_name||"—")+'</b></div><div class="row"><span>Jumlah</span><b>'+e(o.quantity??"—")+'</b></div><div class="row"><span>Harga satuan</span><b>'+money(o.unit_price)+'</b></div><div class="row"><span>Subtotal</span><b>'+money(o.subtotal_price)+'</b></div><div class="row"><span>Voucher</span><b>'+e(o.voucher_code||"—")+'</b></div><div class="row"><span>Diskon</span><b>− '+money(o.discount_amount)+'</b></div><div class="row total"><span>Total</span><b>'+money(o.total_price)+'</b></div>\n  <div class="status">Status: <b>'+e(o.status||"Menunggu")+'</b> · Progres: <b>'+e(o.progress_percent??0)+'%</b></div><p class="meta">Invoice ini merupakan ringkasan pesanan dari MATTHEW JOKI.</p></main><div class="actions"><button onclick="window.print()">Cetak / Simpan PDF</button><button class="back" onclick="history.back()">Kembali</button></div></body></html>';
  const invoiceUrl=URL.createObjectURL(new Blob([invoiceHtml],{type:"text/html;charset=utf-8"}));
  const invoiceTab=window.open(invoiceUrl,"_blank");
  if(!invoiceTab){URL.revokeObjectURL(invoiceUrl);alert("Tab invoice diblokir browser. Izinkan pop-up untuk situs MATTHEW JOKI lalu coba lagi.");return;}
  window.setTimeout(()=>URL.revokeObjectURL(invoiceUrl),60000);
 }
})();
