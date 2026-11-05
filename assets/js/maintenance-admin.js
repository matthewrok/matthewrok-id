document.addEventListener("DOMContentLoaded", async () => {
  const db = window.supabaseClient;
  const $ = id => document.getElementById(id);
  const form = $("maintenanceForm");
  if (!db || !form) return;
  const feedback = (message, error = false) => {
    const el = $("maintenanceFeedback");
    el.textContent = message;
    el.className = "feature-feedback" + (error ? " is-error" : "");
  };
  const localDateTime = value => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,16);
  };
  const selectedModules = () => [...form.querySelectorAll('input[name="maintenance_modules"]:checked')].map(x => x.value);
  const setBusy = busy => {
    form.querySelectorAll("input,select,textarea,button").forEach(x => x.disabled = busy);
    $("maintenanceDisableNow").disabled = busy;
  };
  try {
    const { data: admin, error: adminError } = await db.rpc("is_admin");
    if (adminError || admin !== true) {
      feedback("Akses maintenance control hanya tersedia untuk admin terverifikasi.", true);
      form.hidden = true;
      return;
    }
    const load = async () => {
      const [{data,error},{data:audit,error:auditError}] = await Promise.all([
        db.rpc("get_public_maintenance_status"),
        db.rpc("admin_get_maintenance_audit")
      ]);
      if (error) throw error;
      const state = Array.isArray(data) ? data[0] : data;
      if (!state) throw new Error("Konfigurasi maintenance belum tersedia.");
      $("maintenanceEnabled").checked = Boolean(state.enabled);
      $("maintenanceMode").value = state.mode || "full";
      $("maintenanceMessageInput").value = state.message || "";
      $("maintenanceEtaInput").value = localDateTime(state.estimated_end_at);
      form.querySelectorAll('input[name="maintenance_modules"]').forEach(x => x.checked = (state.affected_modules || []).includes(x.value));
      $("maintenanceCurrentState").textContent = state.enabled
        ? "AKTIF · " + String(state.mode).toUpperCase()
        : "NONAKTIF · WEBSITE BEROPERASI NORMAL";
      $("maintenanceCurrentState").className = "maintenance-state " + (state.enabled ? "is-active" : "is-off");
      const body = $("maintenanceAuditBody");
      body.replaceChildren();
      if (auditError) {
        const tr=document.createElement("tr"),td=document.createElement("td");
        td.colSpan=4;td.textContent="Riwayat belum dapat dimuat: "+auditError.message;tr.append(td);body.append(tr);
      } else if (!audit?.length) {
        const tr=document.createElement("tr"),td=document.createElement("td");
        td.colSpan=4;td.textContent="Belum ada perubahan maintenance.";tr.append(td);body.append(tr);
      } else {
        const fmt=new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"});
        audit.forEach(item=>{
          const tr=document.createElement("tr");
          const time=document.createElement("td");time.textContent=fmt.format(new Date(item.created_at));
          const action=document.createElement("td");action.textContent=item.action;
          const actor=document.createElement("td");actor.textContent=item.actor_id||"—";
          const detail=document.createElement("td");detail.textContent=String(item.new_state?.mode||"")+(item.new_state?.enabled?" · Aktif":" · Nonaktif");
          tr.append(time,action,actor,detail);body.append(tr);
        });
      }
    };
    await load();
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const mode=$("maintenanceMode").value;
      const enabled=$("maintenanceEnabled").checked;
      const modules=selectedModules();
      if (enabled && mode==="system" && !modules.length) return feedback("Pilih minimal satu modul untuk System Maintenance.",true);
      setBusy(true);feedback("Menyimpan konfigurasi dan mencatat audit…");
      try {
        const eta=$("maintenanceEtaInput").value;
        const {data,error}=await db.rpc("admin_set_maintenance",{
          p_enabled:enabled,p_mode:mode,p_message:$("maintenanceMessageInput").value.trim(),
          p_estimated_end_at:eta?new Date(eta).toISOString():null,p_affected_modules:modules
        });
        if(error)throw error;
        feedback("Maintenance berhasil diperbarui. Status aktif akan diterapkan oleh backend dan halaman website.");
        await load();
      } catch(e) { feedback(e.message||"Gagal menyimpan maintenance.",true); }
      finally { setBusy(false); }
    });
    $("maintenanceDisableNow").addEventListener("click", async () => {
      if(!confirm("Nonaktifkan maintenance sekarang dan pulihkan semua layanan?"))return;
      setBusy(true);feedback("Memulihkan layanan…");
      try {
        const {error}=await db.rpc("admin_set_maintenance",{
          p_enabled:false,p_mode:$("maintenanceMode").value,
          p_message:$("maintenanceMessageInput").value.trim(),p_estimated_end_at:null,p_affected_modules:[]
        });
        if(error)throw error;
        feedback("Maintenance dinonaktifkan. Semua modul kembali mengikuti operasi normal.");
        await load();
      } catch(e){feedback(e.message||"Gagal memulihkan layanan.",true);}
      finally{setBusy(false);}
    });
  } catch(error) {
    feedback("Gagal memuat kontrol maintenance: "+(error.message||"periksa koneksi."),true);
  }
});