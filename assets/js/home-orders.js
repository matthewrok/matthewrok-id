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
  let selected=null;
  const money=n=>"Rp"+Number(n).toLocaleString("id-ID");
  function updateTotal(){
    const p=products[selected]; if(!p||!quantity)return;
    // Jangan paksa input kembali ke 1 setiap pengguna menghapus angka.
    const raw=quantity.value.trim();
    const qty=raw===""?0:Math.max(0,Math.min(20,Number(raw)||0));
    $("jokiOrderTotal").textContent=qty>0?money(p.price*qty):"Masukkan jumlah";
  }
  function normalizeQuantity(){
    if(!quantity)return;
    const raw=quantity.value.trim();
    const qty=raw===""?1:Math.max(1,Math.min(20,Math.floor(Number(raw)||1)));
    quantity.value=String(qty);
    updateTotal();
  }
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
    if(!identity?.name){alert("Silakan login atau masuk sebagai visitor terlebih dahulu.");return;}
    selected=code;
    $("jokiOrderName").textContent=identity.name;
    $("jokiOrderEmail").textContent=identity.email||"Visitor";
    $("jokiOrderProduct").textContent=p.name+" · "+p.display;
    quantity.value="1";$("jokiOrderMessage").textContent="";
    const submit=$("jokiOrderSubmit");
    submit.disabled=false;submit.textContent="BUAT PESANAN & LANJUT WHATSAPP ↗";
    updateTotal();modal?.classList.remove("hidden");
  }
  document.querySelectorAll("[data-order-product]").forEach(button=>{
    button.addEventListener("click",event=>{event.preventDefault();openOrder(button.dataset.orderProduct);});
  });
  quantity?.addEventListener("input",updateTotal);
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
    button.disabled=true;button.textContent="MENYIMPAN PESANAN...";
    $("jokiOrderMessage").textContent="Membuat nomor order unik...";
    try{
      const {data,error}=await db.rpc("create_joki_order",{
        p_client_name:identity.name,p_client_email:identity.email||"",
        p_product_code:selected,p_quantity:requestedQty
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
        "TOTAL PESANAN: "+money(order.total_price),"","Status Awal: "+order.status,
        "Progress: 0% — Menunggu Pembayaran / Administrasi","",
        "Mohon konfirmasi detail pembayaran dan administrasi. Nomor order ini dapat digunakan untuk melacak progres:",
        "https://matthewrok.my.id/joki-matthew.html","","Terima kasih."
      ].join("\n");
      $("jokiOrderMessage").textContent="Nomor order "+order.order_number+" berhasil dibuat. Mengalihkan ke WhatsApp...";
      window.location.href="https://wa.me/6285894152856?text="+encodeURIComponent(message);
    }catch(error){
      console.error("[Joki Order]",error);
      $("jokiOrderMessage").textContent=error.message||"Pesanan gagal dibuat. Silakan coba kembali.";
      button.disabled=false;button.textContent="COBA LAGI";
    }
  });
})();