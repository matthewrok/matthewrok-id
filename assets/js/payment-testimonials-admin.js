(() => {
  "use strict";
  const db = window.supabaseClient;
  const form = document.getElementById("testimonialUploadForm");
  if (!form) return;
  const fileInput = document.getElementById("paymentImage");
  const captionInput = document.getElementById("paymentCaption");
  const dateInput = document.getElementById("paymentDate");
  const previewWrap = document.getElementById("imagePreviewWrap");
  const previewImage = document.getElementById("imagePreview");
  const button = document.getElementById("uploadPaymentButton");
  const feedback = document.getElementById("uploadFeedback");
  const list = document.getElementById("adminTestimonialsList");
  const count = document.getElementById("adminGalleryCount");
  const MAX_INPUT_BYTES = 10 * 1024 * 1024;
  const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
  let processedBlob = null;
  let previewUrl = null;

  const setFeedback = (message, isError = false) => {
    feedback.textContent = message;
    feedback.classList.toggle("error", isError);
  };
  const formatDate = value => {
    if (!value) return "Tanggal tidak dicantumkan";
    const parsed = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
    return Number.isNaN(parsed.getTime()) ? "Tanggal tidak dicantumkan" :
      new Intl.DateTimeFormat("id-ID", {dateStyle:"medium"}).format(parsed);
  };
  const safeText = value => value == null || value === "" ? "Dokumentasi pembayaran" : String(value);

  async function loadLogo() {
    const logo = new Image();
    logo.src = "/assets/images/brand/logo-matthew.png";
    await new Promise((resolve, reject) => {
      logo.onload = resolve;
      logo.onerror = () => reject(new Error("Logo watermark tidak dapat dimuat."));
    });
    return logo;
  }

  async function createWatermarkedImage(file) {
    if (!file || !["image/jpeg","image/png","image/webp"].includes(file.type)) {
      throw new Error("Gunakan foto JPG, PNG, atau WebP.");
    }
    if (file.size > MAX_INPUT_BYTES) throw new Error("Ukuran foto maksimal 10 MB.");
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, {imageOrientation:"from-image"});
    } catch {
      bitmap = await createImageBitmap(file);
    }
    try {
      const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", {alpha:false});
      if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0,0,width,height);
      ctx.drawImage(bitmap,0,0,width,height);

      const shortSide = Math.min(width,height);
      const fontSize = Math.max(13, Math.round(shortSide * .035));
      ctx.save();
      ctx.translate(width/2,height/2);
      ctx.rotate(-Math.PI/4);
      ctx.font = "800 " + fontSize + "px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,.27)";
      ctx.strokeStyle = "rgba(5,25,49,.19)";
      ctx.lineWidth = Math.max(1,fontSize*.09);
      const stepX = Math.max(190,fontSize*10);
      const stepY = Math.max(115,fontSize*5.5);
      for (let y=-width-height; y<=width+height; y+=stepY) {
        for (let x=-width-height; x<=width+height; x+=stepX) {
          ctx.strokeText("MATTHEW JOKI",x,y);
          ctx.fillText("MATTHEW JOKI",x,y);
        }
      }
      ctx.restore();

      const logo = await loadLogo();
      const logoWidth = Math.min(width*.25, shortSide*.31, 230);
      const logoHeight = logoWidth * (logo.height / logo.width);
      const logoX = (width-logoWidth)/2;
      const logoY = (height-logoHeight)/2;
      ctx.save();
      ctx.globalAlpha = .30;
      ctx.shadowColor = "rgba(0,0,0,.55)";
      ctx.shadowBlur = Math.max(5,shortSide*.012);
      ctx.drawImage(logo,logoX,logoY,logoWidth,logoHeight);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = .78;
      ctx.textAlign = "center";
      ctx.font = "800 " + Math.max(10,Math.round(shortSide*.022)) + "px Inter, Arial, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(0,0,0,.8)";
      ctx.shadowBlur = 5;
      ctx.fillText("MATTHEW JOKI",width/2,Math.min(height-14,logoY+logoHeight+Math.max(18,shortSide*.04)));
      ctx.restore();

      const blob = await new Promise((resolve,reject) => canvas.toBlob(
        result => result ? resolve(result) : reject(new Error("Gagal membuat file watermark.")),
        "image/webp", .88
      ));
      if (blob.size > MAX_OUTPUT_BYTES) throw new Error("Hasil watermark terlalu besar. Gunakan foto dengan resolusi atau ukuran file lebih kecil.");
      return blob;
    } finally {
      bitmap.close?.();
    }
  }

  async function refreshPreview() {
    processedBlob = null;
    const file = fileInput.files?.[0];
    if (!file) {
      previewWrap.hidden = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
      return;
    }
    try {
      setFeedback("Memproses watermark untuk pratinjau…");
      processedBlob = await createWatermarkedImage(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(processedBlob);
      previewImage.src = previewUrl;
      previewWrap.hidden = false;
      setFeedback("Watermark berhasil dibuat. Foto siap dipublikasikan.");
    } catch (error) {
      previewWrap.hidden = true;
      setFeedback(error.message || "Foto tidak dapat diproses.", true);
    }
  }

  async function verifyAdmin() {
    if (!db) throw new Error("Koneksi Supabase tidak tersedia.");
    const {data:{session},error:sessionError} = await db.auth.getSession();
    if (sessionError || !session) throw new Error("Sesi admin tidak ditemukan. Silakan login ulang.");
    const {data:profile,error:profileError} = await db.from("profiles").select("role,account_status").eq("id",session.user.id).maybeSingle();
    if (profileError || profile?.role !== "admin" || String(profile.account_status || "").toLowerCase() !== "active") {
      throw new Error("Akses ditolak. Fitur ini hanya untuk akun admin aktif.");
    }
    return session.user;
  }

  function createAction(label, className, handler) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = className || "";
    action.textContent = label;
    action.addEventListener("click",handler);
    return action;
  }

  async function loadItems() {
    const {data,error} = await db.from("payment_testimonials")
      .select("id,image_path,caption,transaction_date,published,display_order,created_at")
      .order("display_order",{ascending:true}).order("created_at",{ascending:false});
    if (error) throw error;
    const items = data || [];
    count.textContent = items.length + " dokumentasi";
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "gallery-state";
      empty.textContent = "Belum ada bukti pembayaran yang diunggah.";
      list.append(empty);
      return;
    }
    items.forEach(item => {
      const row = document.createElement("article");
      row.className = "admin-testimonial-row";
      const {data:publicData} = db.storage.from("payment-testimonials").getPublicUrl(item.image_path);
      const image = document.createElement("img");
      image.src = publicData.publicUrl;
      image.alt = "Foto bukti pembayaran dengan watermark";
      image.loading = "lazy";
      const meta = document.createElement("div");
      meta.className = "admin-testimonial-meta";
      const title = document.createElement("strong");
      title.textContent = safeText(item.caption);
      const date = document.createElement("small");
      date.textContent = formatDate(item.transaction_date || item.created_at?.slice(0,10));
      const status = document.createElement("span");
      status.className = "status-badge";
      status.textContent = item.published ? "Tayang publik" : "Disembunyikan";
      meta.append(title,date,status);
      const actions = document.createElement("div");
      actions.className = "row-actions";
      actions.append(createAction("↑ Urutkan naik","",async () => {
        try {
          const {error:sortError} = await db.from("payment_testimonials").update({display_order:Number(item.display_order || 0)-10}).eq("id",item.id);
          if (sortError) throw sortError;
          await loadItems();
          setFeedback("Urutan dokumentasi diperbarui.");
        } catch (error) { setFeedback(error.message || "Urutan gagal diubah.",true); }
      }));
      actions.append(createAction("↓ Urutkan turun","",async () => {
        try {
          const {error:sortError} = await db.from("payment_testimonials").update({display_order:Number(item.display_order || 0)+10}).eq("id",item.id);
          if (sortError) throw sortError;
          await loadItems();
          setFeedback("Urutan dokumentasi diperbarui.");
        } catch (error) { setFeedback(error.message || "Urutan gagal diubah.",true); }
      }));
      actions.append(createAction(item.published ? "Sembunyikan" : "Publikasikan","",async () => {
        try {
          const {error:updateError} = await db.from("payment_testimonials").update({published:!item.published}).eq("id",item.id);
          if (updateError) throw updateError;
          await loadItems();
          setFeedback(item.published ? "Dokumentasi disembunyikan dari publik." : "Dokumentasi berhasil dipublikasikan.");
        } catch (error) { setFeedback(error.message || "Status publikasi gagal diubah.",true); }
      }));
      actions.append(createAction("Hapus","danger",async () => {
        if (!window.confirm("Hapus dokumentasi ini secara permanen?")) return;
        try {
          const {error:deleteError} = await db.from("payment_testimonials").delete().eq("id",item.id);
          if (deleteError) throw deleteError;
          const {error:storageError} = await db.storage.from("payment-testimonials").remove([item.image_path]);
          if (storageError) console.warn("File storage perlu dibersihkan manual:",storageError.message);
          await loadItems();
          setFeedback("Dokumentasi berhasil dihapus.");
        } catch (error) { setFeedback(error.message || "Dokumentasi gagal dihapus.",true); }
      }));
      row.append(image,meta,actions);
      list.append(row);
    });
  }

  fileInput.addEventListener("change",refreshPreview);
  form.addEventListener("submit",async event => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = "Memproses & mengunggah…";
    try {
      const user = await verifyAdmin();
      const file = fileInput.files?.[0];
      if (!file) throw new Error("Pilih foto pembayaran terlebih dahulu.");
      if (!processedBlob) await refreshPreview();
      if (!processedBlob) throw new Error("Foto belum berhasil diproses. Periksa pesan pratinjau.");
      const path = new Date().toISOString().slice(0,10) + "/" + crypto.randomUUID() + ".webp";
      const {error:uploadError} = await db.storage.from("payment-testimonials").upload(path,processedBlob,{
        contentType:"image/webp",upsert:false,cacheControl:"31536000"
      });
      if (uploadError) throw uploadError;
      const {error:insertError} = await db.from("payment_testimonials").insert({
        image_path:path,
        caption:captionInput.value.trim() || null,
        transaction_date:dateInput.value || null,
        published:true,
        created_by:user.id
      });
      if (insertError) {
        await db.storage.from("payment-testimonials").remove([path]).catch(()=>{});
        throw insertError;
      }
      form.reset();
      previewWrap.hidden = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
      processedBlob = null;
      await loadItems();
      setFeedback("Berhasil! Watermark sudah menyatu permanen dengan foto dan dokumentasi langsung dipublikasikan.");
    } catch (error) {
      console.error("[Payment testimonials admin]",error);
      setFeedback(error.message || "Upload gagal. Periksa konfigurasi bucket dan policy Supabase.",true);
    } finally {
      button.disabled = false;
      button.textContent = "Proses Watermark & Publikasikan";
    }
  });

  document.addEventListener("DOMContentLoaded",async () => {
    try {
      await verifyAdmin();
      await loadItems();
    } catch (error) {
      setFeedback(error.message || "Halaman admin tidak dapat dimuat.",true);
      count.textContent = "Tidak tersedia";
      list.replaceChildren();
      const message = document.createElement("p");
      message.className = "gallery-state";
      message.textContent = "Tidak dapat memuat dokumentasi admin.";
      list.append(message);
    }
  });
  window.addEventListener("beforeunload",() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });
})();