(() => {
 const db=window.supabaseClient,$=id=>document.getElementById(id);
 const catalog={
  CH11:{name:"City Hall 11",tier:"STARTER",price:"17K/char",detail:"Siege 10K · Deadline 1–2 hari"},
  CH13:{name:"City Hall 13/13",tier:"ADVANCED",price:"45K/char",detail:"Siege 25K · Resource 25–30M"},
  CH17:{name:"City Hall 17/17",tier:"ELITE",price:"115K/char",detail:"Siege 80–100K · Resource 60–80M"}
 };
 const message=(text,type="")=>{const el=$("wishlistMessage");el.textContent=text;el.className="message"+(type?" "+type:"");};
 const safe=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function load(){
  if(!db?.auth){message("Koneksi akun belum tersedia.","error");return;}
  const {data:{session},error}=await db.auth.getSession();
  if(error||!session){location.replace("/login.html?next=member-wishlist.html");return;}
  const {data,error:profileError}=await db.from("profiles").select("role,account_status").eq("id",session.user.id).maybeSingle();
  if(profileError||!data||String(data.account_status).toLowerCase()!=="active"||!["warga biasa","warga tidak biasa","warga sultan"].includes(String(data.role).trim().toLowerCase())){
   message("Wishlist hanya tersedia untuk akun Warga yang aktif.","error");return;
  }
  const {data:items,error:loadError}=await db.rpc("get_my_package_wishlist");
  if(loadError)throw loadError;
  render(items||[]);
 }
 function render(items){
  $("wishlistCount").textContent=items.length;
  $("wishlistEmpty").hidden=items.length!==0;
  $("wishlistGrid").innerHTML=items.map(item=>{
   const p=catalog[item.product_code];if(!p)return "";
   return '<article class="wishlist-card"><span class="tier">'+safe(p.tier)+'</span><h2>'+safe(p.name)+'</h2><p>'+safe(p.detail)+'</p><div class="price">'+safe(p.price)+'</div><div class="card-actions"><a class="order-link" href="/index.html?order='+safe(item.product_code)+'">PESAN PAKET</a><button class="remove-button" type="button" data-remove="'+safe(item.product_code)+'">HAPUS</button></div></article>';
  }).join("");
  message(items.length?"Paket favorit berhasil dimuat.":"Wishlist kamu masih kosong.", "success");
 }
 $("wishlistGrid").addEventListener("click",async event=>{
  const button=event.target.closest("[data-remove]");if(!button)return;
  button.disabled=true;button.textContent="MENGHAPUS...";
  try{const {error}=await db.rpc("remove_my_package_from_wishlist",{p_product_code:button.dataset.remove});if(error)throw error;await load();}
  catch(error){message(error.message||"Paket gagal dihapus.","error");button.disabled=false;button.textContent="HAPUS";}
 });
 load().catch(error=>{console.error("[Wishlist]",error);message(error.message||"Wishlist gagal dimuat.","error");});
})();
