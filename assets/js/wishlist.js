(() => {
 const db=window.supabaseClient,buttons=[...document.querySelectorAll("[data-wishlist-product]")],saved=new Set();
 if(!buttons.length)return;
 const setButton=(button,isSaved)=>{button.setAttribute("aria-pressed",String(isSaved));button.textContent=isSaved?"♥ TERSIMPAN":"♡ SIMPAN";};
 async function init(){
  if(!db?.auth){buttons.forEach(b=>b.disabled=true);return;}
  const {data:{session},error}=await db.auth.getSession();
  if(error||!session){buttons.forEach(b=>b.title="Login sebagai member untuk menyimpan paket");return;}
  const {data:profile}=await db.from("profiles").select("role,account_status").eq("id",session.user.id).maybeSingle();
  const eligible=profile&&String(profile.account_status||"").toLowerCase()==="active"&&["warga_biasa","warga_tidak_biasa","warga_sultan"].includes(String(profile.role||"").toLowerCase());
  if(!eligible){buttons.forEach(b=>{b.disabled=true;b.title="Wishlist hanya tersedia untuk member Warga aktif";});return;}
  const {data,error:loadError}=await db.rpc("get_my_package_wishlist");
  if(loadError){console.warn("[Wishlist] Gagal memuat status simpan:",loadError);return;}
  (data||[]).forEach(item=>saved.add(String(item.product_code).toUpperCase()));
  buttons.forEach(b=>setButton(b,saved.has(b.dataset.wishlistProduct.toUpperCase())));
 }
 buttons.forEach(button=>button.addEventListener("click",async()=>{
  if(button.disabled)return;
  const {data:{session}}=await db.auth.getSession();
  if(!session){location.href="/login.html?next=index.html%23produk";return;}
  const code=button.dataset.wishlistProduct.toUpperCase(),wasSaved=saved.has(code);button.disabled=true;
  try{const {error}=await db.rpc(wasSaved?"remove_my_package_from_wishlist":"add_my_package_to_wishlist",{p_product_code:code});if(error)throw error;if(wasSaved)saved.delete(code);else saved.add(code);setButton(button,saved.has(code));}
  catch(error){console.error("[Wishlist]",error);alert(error.message||"Paket gagal diperbarui.");}
  finally{button.disabled=false;}
 }));
 init().catch(error=>console.warn("[Wishlist] Init gagal:",error));
})();
