(() => {
  "use strict";
  const db = window.supabaseClient;
  const $ = id => document.getElementById(id);
  const products = {
    CH11:{name:"City Hall 11",price:17000,display:"17K/char"},
    CH12:{name:"City Hall 12",price:29000,display:"29K–35K/char"},
    CH13:{name:"City Hall 13",price:45000,display:"45K/char"},
    CH14:{name:"City Hall 14",price:55000,display:"55K/char"},
    CH15:{name:"City Hall 15",price:75000,display:"75K/char"},
    CH16:{name:"City Hall 16",price:85000,display:"85K/char"},
    CH17:{name:"City Hall 17",price:120000,display:"120K/char"},
    "AP-LOHAR":{name:"Joki Action Point / Lohar",price:1000,display:"Rp1.000/1K AP"}
  };
  const modal=$("jokiOrderModal"), quantity=$("jokiOrderQuantity");
  let selected=null, appliedVoucher=null, completedWhatsappUrl=null;
  const money=n=>"Rp"+Number(n).toLocaleString("id-ID");
  const selectedCh12Variant=()=>document.querySelector('input[name="jokiOrderVariant"]:checked')?.value||"";
  function parseActionPointK(raw){
    const value=String(raw??"").trim().replace(/[\s.,]/g,"");
    if(!/^\d+$/.test(value))return null;
    let amount=Number(value);
    if(!Number.isSafeInteger(amount)||amount<1)return null;
    // Terima format 1 (= 1K), 1.000 (= 1K), maupun 1000 (= 1K).
    if(amount>=1000){
      if(amount%1000!==0)return null;
      amount/=1000;
    }
    return amount<=1000000?amount:null;
  }
  function updateTotal(){
    const p=products[selected]; if(!p||!quantity)return;
    const raw=quantity.value.trim();
    const isActionPoint=selected==="AP-LOHAR";
    const qty=isActionPoint?(raw===""?0:(parseActionPointK(raw)||0)):(raw===""?0:Math.max(0,Math.min(12,Number(raw)||0)));
    const unitPrice=selected==="CH12"&&selectedCh12Variant()==="ISIAN"?35000:p.price;
    const subtotal=qty>0?unitPrice*qty:0; const discount=appliedVoucher&&qty>0?calculateDiscount(appliedVoucher,subtotal):0;
    $("jokiOrderSubtotal").textContent=qty>0?money(subtotal):"—";
    $("jokiOrderDiscount").textContent=money(discount);
    $("jokiOrderTotal").textContent=qty>0?money(subtotal-discount):"Masukkan jumlah";
  }
  function normalizeQuantity(){
    if(!quantity)return;
    const raw=quantity.value.trim();
    if(raw===""){updateTotal();return;}
    if(selected==="AP-LOHAR"){
      const amount=parseActionPointK(raw);
      if(amount===null){$("jokiOrderQuantityHint").textContent="Masukkan jumlah valid: 1 = 1K atau 1.000 = 1K Action Point.";updateTotal();return;}
      // Tampilkan jumlah AP aktual dengan pemisah ribuan agar pengguna langsung melihat
      // bahwa input "1" berarti 1.000 AP (1K), bukan satu AP.
      const formattedAp=(amount*1000).toLocaleString("id-ID");
      quantity.value=formattedAp;
      $("jokiOrderQuantityHint").textContent=formattedAp+" AP · "+amount+"K Action Point · Rp"+(amount*1000).toLocaleString("id-ID");
      updateTotal();return;
    }
    const qty=Math.min(12,Math.max(0,Math.floor(Number(raw)||0)));
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
  async function resolveIdentity(){
    let identity=getIdentity();
    if(identity?.name)return identity;
    // HomeApp profile loading can race with a fast tap; resolve the active Supabase session directly.
    if(db){
      const {data:{user},error}=await db.auth.getUser();
      if(!error&&user){
        const {data:profile}=await db.from("profiles").select("full_name,role").eq("id",user.id).maybeSingle();
        if(profile){
          identity={name:profile.full_name||user.email||"Client",email:user.email||"",isVisitor:false};
          window.HomeApp=window.HomeApp||{};
          window.HomeApp.currentIdentity=identity;
          return identity;
        }
      }
    }
    const visitorName=sessionStorage.getItem("matthewVisitorName");
    return visitorName?{name:visitorName,email:"",isVisitor:true}:null;
  }
  async function getOrderMaintenanceMessage(){
    const {data,error}=await db.rpc("get_public_maintenance_status");
    if(error)return "Status layanan tidak dapat diverifikasi. Pemesanan sementara tidak dapat dilanjutkan.";
    const state=Array.isArray(data)?data[0]:data;
    if(!state?.enabled)return "";
    const modules=Array.isArray(state.affected_modules)?state.affected_modules:[];
    const blocked=state.mode==="full"||state.mode==="orders"||(state.mode==="system"&&modules.includes("orders"));
    return blocked?(state.message||"Pemesanan sedang dinonaktifkan sementara oleh admin."):"";
  }
  async function openOrder(code){
    // Accept the lowercase product identifiers used by the supplied homepage template.
    code=String(code||"").trim().toUpperCase();
    const p=products[code];
    if(!p){console.error("[Joki Order] Kode produk tidak valid:",code);return;}
    const identity=await resolveIdentity();
    if(!identity?.name){alert("Sesi login belum terbaca. Muat ulang halaman atau login kembali.");return;}
    if(identity.isVisitor){alert("Visitor hanya dapat melihat produk. Login dengan akun terverifikasi untuk memesan.");return;}
    const maintenanceMessage=await getOrderMaintenanceMessage();
    if(maintenanceMessage){alert(maintenanceMessage);return;}
    selected=code;
    completedWhatsappUrl=null;
    $("jokiOrderName").textContent=identity.name;
    $("jokiOrderEmail").textContent=identity.email||"Visitor";
    $("jokiOrderProduct").textContent=p.name+" · "+p.display;
    const variantField=$("jokiOrderVariantField");
    if(variantField)variantField.hidden=code!=="CH12";
    document.querySelectorAll('input[name="jokiOrderVariant"]').forEach(input=>{input.checked=false;});
    const isActionPoint=code==="AP-LOHAR";
    const quantityLabel=$("jokiOrderQuantityLabel"),quantityHint=$("jokiOrderQuantityHint"),kingdomField=$("jokiOrderKingdomField"),kingdomInput=$("jokiOrderKingdom");
    if(quantityLabel)quantityLabel.textContent=isActionPoint?"Berapa K Action Point?":"Jumlah Karakter";
    if(quantityHint)quantityHint.textContent=isActionPoint?"Isi 1 = 1K Action Point. Format 1.000 juga dihitung sebagai 1K. Harga Rp1.000 per 1K AP.":"Minimal 4 · Maksimal 12 karakter";
    if(kingdomField)kingdomField.hidden=isActionPoint;
    if(kingdomInput){kingdomInput.required=!isActionPoint;kingdomInput.value="";}
    quantity.value=isActionPoint?"1":"4";
    quantity.placeholder=isActionPoint?"Contoh: 1 atau 1.000":"Masukkan jumlah karakter";
    quantity.type="text";
    $("jokiOrderMessage").textContent="";$("jokiOrderVoucher").value="";$("jokiVoucherMessage").textContent="Masukkan kode jika kamu memiliki voucher.";appliedVoucher=null;
    const submit=$("jokiOrderSubmit");
    submit.disabled=false;submit.textContent="BUAT PESANAN & LANJUT WHATSAPP ↗";
    updateTotal();document.body.classList.add("order-modal-open");modal?.classList.remove("hidden");$("jokiOrderClose")?.focus();
  }
  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-order-product]");
    if(!button)return;
    event.preventDefault();
    openOrder(button.dataset.orderProduct).catch(error=>{
      console.error("[Joki Order] Gagal membuka formulir:",error);
      alert("Formulir pesanan gagal dibuka. Muat ulang halaman dan coba lagi.");
    });
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
  window.addEventListener("matthew:identity-ready",syncVisitorRestrictions);
  quantity?.addEventListener("input",()=>{
    if(selected==="AP-LOHAR"){
      const amount=parseActionPointK(quantity.value);
      $("jokiOrderQuantityHint").textContent=amount===null
        ?"Masukkan 1 untuk 1.000 AP (1K), atau jumlah ribuan lainnya."
        :(amount*1000).toLocaleString("id-ID")+" AP · "+amount+"K Action Point";
    }else if(Number(quantity.value)>12)quantity.value="12";
    updateTotal();
  });
  $("jokiApplyVoucher")?.addEventListener("click",applyVoucher);
  $("jokiOrderVoucher")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();applyVoucher();}});
  quantity?.addEventListener("blur",normalizeQuantity);
  function closeOrderModal(){
    if(!modal)return;
    modal.classList.add("hidden");
    document.body.classList.remove("order-modal-open");
  }
  $("jokiOrderClose")?.addEventListener("click",closeOrderModal);
  document.addEventListener("change",event=>{if(event.target.matches('input[name="jokiOrderVariant"]'))updateTotal();});
  modal?.addEventListener("click",event=>{if(event.target===modal)closeOrderModal();});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!modal?.classList.contains("hidden"))closeOrderModal();});
  const requestedProduct=new URLSearchParams(window.location.search).get("order");
  if(requestedProduct&&products[requestedProduct.toUpperCase()]){
    window.addEventListener("load",()=>openOrder(requestedProduct).catch(error=>console.error("[Joki Order] Gagal membuka paket dari riwayat:",error)),{once:true});
  }
  $("jokiOrderSubmit")?.addEventListener("click",async()=>{
    const identity=getIdentity(),p=products[selected],button=$("jokiOrderSubmit");
    if(completedWhatsappUrl){window.open(completedWhatsappUrl,"_blank","noopener");return;}
    if(!db||!identity?.name||!p){$("jokiOrderMessage").textContent="Identitas atau layanan belum siap. Muat ulang halaman dan coba lagi.";return;}
    if(identity.isVisitor){$("jokiOrderMessage").textContent="Visitor tidak dapat membuat pesanan. Silakan login dengan akun terverifikasi.";return;}
    const isActionPoint=selected==="AP-LOHAR";
    const kingdomInput=$("jokiOrderKingdom");
    const kingdomNumber=isActionPoint?null:(kingdomInput?.value||"").trim();
    if(!isActionPoint&&!/^[0-9]{4}$/.test(kingdomNumber)){
      $("jokiOrderMessage").textContent="Nomor Kingdom wajib diisi tepat 4 digit angka.";
      kingdomInput?.focus();
      return;
    }
    const variant=selectedCh12Variant();
    if(selected==="CH12"&&!["KOSONGAN","ISIAN"].includes(variant)){
      $("jokiOrderMessage").textContent="Pilih tipe City Hall 12: KOSONGAN atau ISIAN.";
      $("jokiOrderVariant")?.focus();
      return;
    }
    normalizeQuantity();
    const requestedQty=isActionPoint?parseActionPointK(quantity.value):Number(quantity.value);
    if(isActionPoint?!Number.isInteger(requestedQty)||requestedQty<1||requestedQty>1000000:!Number.isInteger(requestedQty)||requestedQty<4||requestedQty>12){
      $("jokiOrderMessage").textContent=isActionPoint?"Jumlah Action Point tidak valid. Gunakan 1 untuk 1K atau 1.000 untuk 1K.":"Jumlah karakter harus minimal 4 dan maksimal 12.";
      return;
    }
    // Buka tab kosong saat klik masih dianggap interaksi pengguna oleh browser mobile.
    // URL WhatsApp baru diisi setelah RPC selesai agar tidak diblokir popup blocker.
    let whatsappTab=null;
    try{whatsappTab=window.open("about:blank","_blank");}catch(_e){}
    button.disabled=true;button.textContent="MENYIMPAN PESANAN...";
    $("jokiOrderMessage").textContent="Membuat nomor order dan token pelacakan rahasia...";
    try{
      const {data,error}=await db.rpc("create_joki_order_secure",{
        p_client_name:identity.name,p_client_email:identity.email||"",
        p_product_code:selected==="CH12"?"CH12-"+variant:selected,p_quantity:requestedQty,p_voucher_code:appliedVoucher?.code||null,
        p_kingdom_number:kingdomNumber
      });
      if(error)throw error;
      const order=Array.isArray(data)?data[0]:data;
      if(!order?.order_number||!order?.tracking_token)throw new Error("Nomor order atau token pelacakan belum berhasil dibuat.");
      const message=[
        "HALO MATTHEW, SAYA INGIN KONFIRMASI PESANAN JOKI.","",
        "=== DETAIL PESANAN MATTHEW JOKI ===",
        "No. Order: "+order.order_number,"Nama Client: "+order.client_name,
        ...(isActionPoint?[]:["Kingdom: "+kingdomNumber]),
        "Email: "+(order.client_email||"Visitor"),"Produk: "+order.service_name,
        ...(isActionPoint?["Jumlah Action Point: "+order.quantity+"K AP","Harga per 1K AP: "+money(order.unit_price)]:["Jumlah Karakter: "+order.quantity,"Harga per Karakter: "+money(order.unit_price)]),
        "Subtotal: "+money(order.subtotal_price??order.total_price),"Voucher: "+(order.voucher_code||"Tidak ada"),"Diskon: "+money(order.discount_amount||0),"TOTAL PESANAN: "+money(order.total_price),"","Status Awal: "+order.status,
        "Progress: 0% — Menunggu Pembayaran / Administrasi","",
        "Token Pelacakan Rahasia: "+order.tracking_token,"",
        "Simpan token ini. Gunakan token tersebut (bukan nomor order) untuk melacak progres:",
        "https://matthewrok.my.id/joki-matthew.html","","Terima kasih."
      ].join("\n");
      $("jokiOrderMessage").textContent="Nomor order "+order.order_number+" berhasil dibuat. Mengalihkan ke WhatsApp...";
      const whatsappUrl="https://wa.me/6285894152856?text="+encodeURIComponent(message);
      // Tandai transaksi selesai sebelum membuka WhatsApp. Klik ulang hanya membuka tautan,
      // tidak pernah memanggil RPC pembuatan order untuk kedua kalinya.
      completedWhatsappUrl=whatsappUrl;
      if(whatsappTab&&!whatsappTab.closed){
        try{whatsappTab.location.replace(whatsappUrl);}catch(navigationError){console.warn("[Joki Order] Tab WhatsApp tidak dapat diarahkan:",navigationError);try{whatsappTab.close();}catch(_e){}}
        $("jokiOrderMessage").textContent="Pesanan berhasil dibuat. Jika WhatsApp belum terbuka, gunakan tombol di bawah.";
        button.disabled=false;button.textContent="BUKA WHATSAPP ↗";
      }else{
        // Fallback same-tab jika browser menolak tab baru.
        $("jokiOrderMessage").textContent="Pesanan berhasil dibuat. Mengalihkan ke WhatsApp...";
        window.location.assign(whatsappUrl);
      }
    }catch(error){
      if(whatsappTab&&!whatsappTab.closed){try{whatsappTab.close();}catch(_e){}}
      console.error("[Joki Order]",error);
      $("jokiOrderMessage").textContent=error.message||"Pesanan gagal dibuat. Silakan coba kembali.";
      if(completedWhatsappUrl){button.disabled=false;button.textContent="BUKA WHATSAPP ↗";}
      else{button.disabled=false;button.textContent="COBA LAGI";}
    }
  });
})();