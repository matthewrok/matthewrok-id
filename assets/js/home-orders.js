(() => {
  "use strict";
  const db = window.supabaseClient;
  const $ = id => document.getElementById(id);
  const products = {
    CH11:{name:"City Hall 11",price:17000,display:"17K/char"},
    CH13:{name:"City Hall 13/13",price:45000,display:"45K/char"},
    CH17:{name:"City Hall 17/17",price:115000,display:"115K/char"}
  };
  const modal=$("jokiOrderModal"), quantity=$("jokiOrderQuantity");
  let selected=null, appliedVoucher=null;
  const money=n=>"Rp"+Number(n).toLocaleString("id-ID");
  function updateTotal(){
    const p=products[selected]; if(!p||!quantity)return;
    // Jangan paksa input kembali ke 1 setiap pengguna menghapus angka.
    const raw=quantity.value.trim();
    const qty=raw===""?0:Math.max(0,Math.min(20,Number(raw)||0));
    const subtotal=qty>0?p.price*qty:0; const discount=appliedVoucher&&qty>0?calculateDiscount(appliedVoucher,subtotal):0; $("jokiOrderSubtotal").textContent=qty>0?money(subtotal):"—"; $("jokiOrderDiscount").textContent=money(discount); $("jokiOrderTotal").textContent=qty>0?money(subtotal-discount):"Masukkan jumlah";
  }
  function normalizeQuantity(){
    if(!quantity)return;
    const raw=quantity.value.trim();
    const qty=raw===""?1:Math.max(1,Math.min(20,Math.floor(Number(raw)||1)));
    quantity.value=String(qty);
    updateTotal();
  }
  function calculateDiscount(voucher,subtotal){return voucher.discount_type==="percent"?Math.floor(subtotal*Math.min(Number(voucher.discount_value),100)/100):Math.min(subtotal,Math.floor(Number(voucher.discount_value)));}
  async function applyVoucher(){if(getIdentity()?.isVisitor){const blocked=$("jokiVoucherMessage");if(blocked)blocked.textContent="Voucher hanya tersedia untuk member yang sudah login.";return;}const input=$("jokiOrderVoucher"),msg=$("jokiVoucherMessage"),code=input.value.trim().toUpperCase();appliedVoucher=null;if(!code){msg.textContent="Masukkan kode voucher terlebih dahulu.";updateTotal();return;}msg.textContent="Memeriksa voucher...";try{const {data,error}=await db.from("vouchers").select("code,description,discount_type,discount_value,max_uses,used_count,starts_at,expires_at,is_active").eq("code",code).maybeSingle();if(error)throw error;if(!data||!data.is_active)throw new Error("Kode voucher tidak ditemukan atau sedang nonaktif.");if(data.starts_at&&new Date(data.starts_at)>new Date())throw new Error("Voucher belum mulai berlaku.");if(data.expires_at&&new Date(data.expires_at)<=new Date())throw new Error("Voucher sudah kedaluwarsa.");if(data.max_uses!==null&&data.used_count>=data.max_uses)throw new Error("Kuota penggunaan voucher sudah habis.");appliedVoucher={code:data.code,discount_type:data.discount_type,discount_value:Number(data.discount_value)};msg.textContent="Voucher "+data.code+" siap digunakan. Diskon akan dikonfirmasi saat pesanan dibuat.";updateTotal();}catch(e){msg.textContent=e.message||"Voucher gagal diperiksa.";updateTotal();}}
  function getIdentity(){
    const identity=window.HomeApp?.currentIdentity;
    if(identity?.name)return identity;
    const visitorName=sessionStorage.getItem("matthewVisitorName");
    if(visitorName)return {name:visitorName,email:"",isVisitor:true};
    return null;
  }
  function openOrder(code){
    const p=products[code],identity=getIdentity();
    if(!p){console.error("[Joki Order] Kode produk tidak valid:",code);return;}
    if(!identity?.name){alert("Silakan login terlebih dahulu untuk memesan produk.");return;}\n    if(identity.isVisitor){alert("Visitor hanya dapat melihat produk. Login sebagai member untuk memesan dan menggunakan voucher.");return;}
    selected=code;
    $("jokiOrderName").textContent=identity.name;
    $("jokiOrderEmail").textContent=identity.email||"Visitor";
    $("jokiOrderProduct").textContent=p.name+" · "+p.display;
    quantity.value="1";$("jokiOrderMessage").textContent="";$("jokiOrderVoucher").value="";$("jokiVoucherMessage").textContent="Masukkan kode jika kamu memiliki voucher.";appliedVoucher=null;
    const submit=$("jokiOrderSubmit");
    submit.disabled=false;submit.textContent="BUAT PESANAN & LANJUT WHATSAPP ↗";
    updateTotal();modal?.classList.remove("hidden");
  }
  document.querySelectorAll("[data-order-product]").forEach(button=>{
    button.addEventListener("click",event=>{event.preventDefault();openOrder(button.dataset.orderProduct);});
  });
  function syncVisitorRestrictions(){
    const visitor=!!getIdentity()?.isVisitor;
    document.querySelectorAll("[data-order-product]").forEach(button=>{
      button.disabled=visitor;button.setAttribute("aria-disabled",String(visitor));
      if(visitor){button.dataset.originalLabel ||= button.textContent.trim();button.textContent="LOGIN UNTUK MEMESAN";}
      else if(button.dataset.originalLabel){button.textContent=button.dataset.originalLabel;delete button.dataset.originalLabel;}
    });
    const voucherInput=$("jokiOrderVoucher"),voucherButton=$("jokiApplyVoucher");
    if(voucherInput){voucherInput.disabled=visitor;voucherInput.placeholder=visitor?"Login sebagai member untuk voucher":"Masukkan kode voucher";}
    if(voucherButton){voucherButton.disabled=visitor;voucherButton.title=visitor?"Voucher hanya untuk member":"Cek voucher";}
  }
  syncVisitorRestrictions();
  quantity?.addEventListener("input",updateTotal);
  $("jokiApplyVoucher")?.addEventListener("click",applyVoucher);
  $("jokiOrderVoucher")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();applyVoucher();}});
  quantity?.addEventListener("blur",normalizeQuantity);
  $("jokiOrderClose")?.addEventListener("click",()=>modal?.classList.add("hidden"));
  modal?.addEventListener("click",event=>{if(event.target===modal)modal.classList.add("hidden");});
  document.addEventListener("keydown",event=>{if(event.key==="Escape")modal?.classList.add("hidden");});
  $("jokiOrderSubmit")?.addEventListener("click",async()=>{
    const identity=getIdentity(),p=products[selected],button=$("jokiOrderSubmit");
    if(!db||!identity?.name||!p){$("jokiOrderMessage").textContent="Identitas atau layanan belum siap. Muat ulang halaman dan coba lagi.";return;}
    normalizeQuantity();
    const requestedQty=Number(quantity.value);
    if(!Number.isInteger(requestedQty)||requestedQty<1||requestedQty>20){
      $("jokiOrderMessage").textContent="Jumlah karakter harus antara 1 sampai 20.";
      return;
    }
    // Buka tab kosong saat klik masih dianggap interaksi pengguna oleh browser mobile.
    // URL WhatsApp baru diisi setelah RPC selesai agar tidak diblokir popup blocker.
    let whatsappTab=null;
    try{whatsappTab=window.open("about:blank","_blank");}catch(_e){}
    button.disabled=true;button.textContent="MENYIMPAN PESANAN...";
    $("jokiOrderMessage").textContent="Membuat nomor order unik...";
    try{
      const {data,error}=await db.rpc("create_joki_order",{
        p_client_name:identity.name,p_client_email:identity.email||"",
        p_product_code:selected,p_quantity:requestedQty,p_voucher_code:appliedVoucher?.code||null
      });
      if(error)throw error;
      const order=Array.isArray(data)?data[0]:data;
      if(!order?.order_number)throw new Error("Nomor order belum berhasil dibuat.");
      const message=[
        "HALO MATTHEW, SAYA INGIN KONFIRMASI PESANAN JOKI.","",
        "=== DETAIL PESANAN MATTHEW JOKI ===",
        "No. Order: "+order.order_number,"Nama Client: "+order.client_name,
        "Email: "+(order.client_email||"Visitor"),"Produk: "+order.service_name,
        "Jumlah Karakter: "+order.quantity,"Harga per Karakter: "+money(order.unit_price),
        "Subtotal: "+money(order.subtotal_price??order.total_price),"Voucher: "+(order.voucher_code||"Tidak ada"),"Diskon: "+money(order.discount_amount||0),"TOTAL PESANAN: "+money(order.total_price),"","Status Awal: "+order.status,
        "Progress: 0% — Menunggu Pembayaran / Administrasi","",
        "Mohon konfirmasi detail pembayaran dan administrasi. Nomor order ini dapat digunakan untuk melacak progres:",
        "https://matthewrok.my.id/joki-matthew.html","","Terima kasih."
      ].join("\n");
      $("jokiOrderMessage").textContent="Nomor order "+order.order_number+" berhasil dibuat. Mengalihkan ke WhatsApp...";
      const whatsappUrl="https://wa.me/6285894152856?text="+encodeURIComponent(message);
      if(whatsappTab&&!whatsappTab.closed){
        whatsappTab.location.href=whatsappUrl;
        $("jokiOrderMessage").textContent="Pesanan berhasil dibuat. WhatsApp dibuka di tab baru. Jika belum terbuka, gunakan tombol di bawah.";
        button.disabled=false;button.textContent="BUKA WHATSAPP ↗";
        button.onclick=()=>{window.open(whatsappUrl,"_blank");};
      }else{
        // Fallback same-tab jika browser menolak tab baru.
        $("jokiOrderMessage").textContent="Pesanan berhasil dibuat. Mengalihkan ke WhatsApp...";
        window.location.assign(whatsappUrl);
      }
    }catch(error){
      console.error("[Joki Order]",error);
      $("jokiOrderMessage").textContent=error.message||"Pesanan gagal dibuat. Silakan coba kembali.";
      button.disabled=false;button.textContent="COBA LAGI";
    }
  });
})();