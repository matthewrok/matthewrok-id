document.addEventListener("DOMContentLoaded", async () => {
 const db=window.supabaseClient,$=id=>document.getElementById(id);if(!db)return;
 const feedback=(id,msg,bad=false)=>{const e=$(id);if(e){e.textContent=msg;e.className="feature-feedback"+(bad?" error":"");}};
 const td=v=>{const e=document.createElement("td");e.textContent=v??"—";return e;};
 const btn=(label,fn,cls="role-save")=>{const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=label;b.onclick=fn;return b;};
 const empty=(id,n,msg)=>{const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=n;td.textContent=msg;tr.append(td);$(id).replaceChildren(tr);};
 try{
  const {data:{session}}=await db.auth.getSession();if(!session)return;
  const {data:me}=await db.from("profiles").select("role").eq("id",session.user.id).maybeSingle();if(me?.role!=="admin")return;
  let memberRows=[];
  function renderMembers(){
   const body=$("managedMembersBody");if(!body)return;
   const query=($("memberSearch")?.value||"").trim().toLocaleLowerCase("id-ID");
   const role=$("memberRoleFilter")?.value||"";
   const status=$("memberStatusFilter")?.value||"";
   const rows=memberRows.filter(m=>{
    const hay=[m.full_name,m.email,m.id].filter(Boolean).join(" ").toLocaleLowerCase("id-ID");
    const memberStatus=m.account_status==="suspended"?"suspended":"active";
    return (!query||hay.includes(query))&&(!role||m.role===role)&&(!status||memberStatus===status);
   });
   body.replaceChildren();
   if(!rows.length)return empty("managedMembersBody",5,memberRows.length?"Tidak ada pengguna yang cocok dengan filter.":"Belum ada pengguna.");
   rows.forEach(m=>{
    const tr=document.createElement("tr");
    tr.append(td(m.full_name),td(m.email),td(m.role),td(m.account_status==="suspended"?"Ditangguhkan":"Aktif"));
    const ac=td("");
    if(m.role==="admin"||m.id===session.user.id){const x=document.createElement("span");x.className="role-protected";x.textContent="Dilindungi";ac.append(x);}
    else ac.append(btn(m.account_status==="suspended"?"Aktifkan":"Suspend",async()=>{
     const nextStatus=m.account_status==="suspended"?"active":"suspended";
     if(!confirm((nextStatus==="active"?"Aktifkan kembali ":"Tangguhkan ")+(m.full_name||m.email)+"?"))return;
     const {error}=await db.rpc("admin_set_member_status",{p_user_id:m.id,p_status:nextStatus});
     if(error)alert(error.message);else await members();
    },m.account_status==="suspended"?"role-save":"danger-action"));
    tr.append(ac);body.append(tr);
   });
  }
  async function members(){
   const {data,error}=await db.from("profiles").select("id,full_name,email,role,account_status").order("created_at",{ascending:false}).limit(1000);
   if(error)throw error;memberRows=data||[];renderMembers();
  }
  ["memberSearch","memberRoleFilter","memberStatusFilter"].forEach(id=>$(id)?.addEventListener("input",renderMembers));
  ["memberRoleFilter","memberStatusFilter"].forEach(id=>$(id)?.addEventListener("change",renderMembers));
  $("clearMemberFilters")?.addEventListener("click",()=>{["memberSearch","memberRoleFilter","memberStatusFilter"].forEach(id=>{const el=$(id);if(el)el.value="";});renderMembers();});
  async function notifications(){const {data,error}=await db.from("site_notifications").select("id,title,audience,is_active").order("created_at",{ascending:false}).limit(100);if(error)throw error;const b=$("notificationsBody");b.replaceChildren();if(!data.length)return empty("notificationsBody",4,"Belum ada notifikasi.");data.forEach(n=>{const tr=document.createElement("tr");tr.append(td(n.title),td(n.audience==="all"?"Semua":"Member"),td(n.is_active?"Aktif":"Nonaktif"));const ac=td("");ac.append(btn(n.is_active?"Nonaktifkan":"Aktifkan",async()=>{const {error}=await db.from("site_notifications").update({is_active:!n.is_active}).eq("id",n.id);if(error)alert(error.message);else notifications();}));tr.append(ac);b.append(tr);});}
  async function vouchers(){const {data,error}=await db.from("vouchers").select("id,code,discount_type,discount_value,used_count,max_uses,is_active").order("created_at",{ascending:false}).limit(100);if(error)throw error;const b=$("vouchersBody");b.replaceChildren();if(!data.length)return empty("vouchersBody",5,"Belum ada voucher.");data.forEach(v=>{const tr=document.createElement("tr");tr.append(td(v.code),td(v.discount_type==="percent"?v.discount_value+"%":"Rp "+Number(v.discount_value).toLocaleString("id-ID")),td(v.used_count+"/"+(v.max_uses??"∞")),td(v.is_active?"Aktif":"Nonaktif"));const ac=td("");ac.append(btn(v.is_active?"Nonaktifkan":"Aktifkan",async()=>{const {error}=await db.from("vouchers").update({is_active:!v.is_active}).eq("id",v.id);if(error)alert(error.message);else vouchers();}));tr.append(ac);b.append(tr);});}
  $("notificationForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,d=new FormData(f),expiry=d.get("expires_at");try{const {error}=await db.from("site_notifications").insert({title:d.get("title").trim(),message:d.get("message").trim(),audience:d.get("audience"),expires_at:expiry?new Date(expiry).toISOString():null,created_by:session.user.id});if(error)throw error;f.reset();feedback("notificationFeedback","Notifikasi berhasil diterbitkan.");await notifications();}catch(x){feedback("notificationFeedback",x.message,true);}});
  $("voucherForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,d=new FormData(f),expiry=d.get("expires_at"),max=d.get("max_uses");try{const {error}=await db.from("vouchers").insert({code:d.get("code").trim().toUpperCase(),description:d.get("description").trim()||null,discount_type:d.get("discount_type"),discount_value:Number(d.get("discount_value")),max_uses:max?Number(max):null,expires_at:expiry?new Date(expiry).toISOString():null,created_by:session.user.id});if(error)throw error;f.reset();feedback("voucherFeedback","Voucher berhasil dibuat.");await vouchers();}catch(x){feedback("voucherFeedback",x.message,true);}});
  async function roleAudit(){
   const {data,error}=await db.from("profile_role_audit").select("id,actor_user_id,target_user_id,old_role,new_role,changed_at").order("changed_at",{ascending:false}).limit(100);
   const body=$("roleAuditBody");
   if(error){empty("roleAuditBody",5,"Riwayat belum tersedia. Pastikan supabase/admin-role-management.sql sudah diterapkan.");console.warn("Role audit unavailable:",error.message);return;}
   body.replaceChildren();
   if(!data.length)return empty("roleAuditBody",5,"Belum ada perubahan role yang tercatat.");
   const fmt=new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"});
   data.forEach(item=>{
    const tr=document.createElement("tr");
    tr.append(td(fmt.format(new Date(item.changed_at))),td(item.actor_user_id),td(item.target_user_id),td(item.old_role),td(item.new_role));
    body.append(tr);
   });
  }
  await Promise.all([members(),notifications(),vouchers(),roleAudit()]);
 }catch(e){console.error(e);feedback("notificationFeedback","Gagal memuat fitur: "+e.message,true);}
});