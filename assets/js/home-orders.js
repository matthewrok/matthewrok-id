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
    const p=products[selected]; if(!p)return;
    const qty=Math.max(1,Math.min(20,Number(quantity.value)||1));
    quantity.value=qty;
    $("jokiOrderTotal").textContent=money(p.price*qty);
  }
  function close(){modal?.classList.add("hidden");}
  document.querySelectorAll("[data-order-product]").forEach(button=>button.addEventListener("click",()=>{
    selected=button.dataset.orderProduct;
    const p=products[selected], identity=window.HomeApp?.currentIdentity;
    if(!identity?.name){alert("Silakan login atau masuk sebagai visitor terlebih dahulu.");return;}
    $("jokiOrderName").textContent=identity.name;
    $("jokiOrderEmail").textContent=identity.email||"Visitor";
    $("jokiOrderProduct").textContent=p.name+" · "+p.display;
    quantity.value=1; $("jokiOrderMessage").textContent="";
    $("jokiOrderSubmit").disabled=false;
    $("jokiOrderSubmit").textContent="BUAT PESANAN & LANJUT WHATSAPP ↗";
    updateTotal(); modal.classList.remove("hidden");
  }));
  quantity?.addEventListener("input",updateTotal);
  $("jokiOrderClose")?.addEventListener("click",close);
  modal?.addEventListener("click",e=>{if(e.target===modal)close();});
  $("jokiOrderSubmit")?.addEventListener("click",async()=>{
    const identity=window.HomeApp?.currentIdentity,p=products[selected],button=$("jokiOrderSubmit");
    if(!db||!identity?.name||!p)return;
    button.disabled=true;button.textContent="MENYIMPAN PESANAN...";
    $("jokiOrderMessage").textContent="Membuat nomor order unik...";
    try{
      const {data,error}=await db.rpc("create_joki_order",{
        p_client_name:identity.name,p_client_email:identity.email||"",
        p_product_code:selected,p_quantity:Number(quantity.value)
      });
      if(error)throw error;
      const order=Array.isArray(data)?data[0]:data;
      if(!order?.order_number)throw new Error("Nomor order belum berhasil dibuat.");
      const qty=Number(order.quantity),total=Number(order.total_price);
      const message=[
        "HALO MATTHEW, SAYA INGIN KONFIRMASI PESANAN JOKI.",
        "",
        "=== DETAIL PESANAN MATTHEW JOKI ===",
        "No. Order: "+order.order_number,
        "Nama Client: "+order.client_name,
        "Email: "+(order.client_email||"Visitor"),
        "Produk: "+order.service_name,
        "Jumlah Karakter: "+qty,
        "Harga per Karakter: "+money(order.unit_price),
        "TOTAL PESANAN: "+money(total),
        "",
        "Status Awal: "+order.status,
        "Progress: 0% — Menunggu Pembayaran / Administrasi",
        "",
        "Mohon konfirmasi detail pembayaran dan administrasi. Saya akan menggunakan No. Order di atas untuk melacak progres melalui:",
        "https://matthewrok.my.id/joki-matthew.html",
        "",
        "Terima kasih."
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