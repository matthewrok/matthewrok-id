(() => {
  const $ = id => document.getElementById(id);
  const labels = {
    'warga biasa':'WARGA BIASA',
    'warga tidak biasa':'WARGA TIDAK BIASA',
    'warga sultan':'WARGA SULTAN'
  };
  const date = value => value
    ? new Intl.DateTimeFormat('id-ID',{dateStyle:'long',timeStyle:'short'}).format(new Date(value))
    : 'Waktu tidak tersedia';

  function showError(message) {
    $('state').textContent = message;
    $('state').hidden = false;
  }

  function renderHistory(history) {
    const timeline = $('timeline');
    timeline.replaceChildren();
    if (!history.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Belum ada catatan perubahan membership. Sistem akan mencatat setiap kenaikan atau penyesuaian level berikutnya.';
      timeline.append(empty);
      return;
    }

    history.forEach(item => {
      const event = document.createElement('article');
      event.className = 'event';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.setAttribute('aria-hidden','true');
      const body = document.createElement('div');
      const title = document.createElement('h3');
      const detail = document.createElement('p');
      const time = document.createElement('time');

      if (item.event_type === 'baseline') {
        title.textContent = 'Awal pencatatan membership';
        detail.textContent = 'Tingkatan saat fitur riwayat mulai digunakan: ' + (labels[item.new_role] || item.new_role) + '.';
      } else if (item.event_type === 'promotion') {
        title.textContent = 'Selamat! Naik ke ' + (labels[item.new_role] || item.new_role) + '.';
        detail.textContent = 'Kamu telah menyelesaikan ' + Number(item.completed_orders || 0).toLocaleString('id-ID') + ' pesanan.';
      } else {
        title.textContent = 'Penyesuaian tingkatan membership';
        detail.textContent = (labels[item.previous_role] || item.previous_role) + ' → ' + (labels[item.new_role] || item.new_role) + ' · ' + Number(item.completed_orders || 0).toLocaleString('id-ID') + ' pesanan selesai.';
      }

      time.dateTime = item.changed_at || '';
      time.textContent = date(item.changed_at);
      body.append(title,detail,time);
      event.append(dot,body);
      timeline.append(event);
    });
  }

  async function init() {
    const db = window.supabaseClient;
    if (!db?.auth) throw new Error('Koneksi Supabase tidak tersedia.');
    if (window.__matthewAccessReady) await window.__matthewAccessReady;
    if (!window.__matthewVerifiedUser) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.');

    const {data,error} = await db.rpc('get_my_warga_membership_history');
    if (error) throw error;
    const result = data || {};
    const role = labels[result.role] || result.role || 'WARGA';
    $('currentRole').textContent = role;
    $('completedOrders').textContent = Number(result.completed_orders || 0).toLocaleString('id-ID');
    const progress = Math.max(0,Math.min(100,Number(result.progress_percent || 0)));
    $('progressBar').style.width = progress + '%';
    $('progressTrack').setAttribute('aria-valuenow',String(progress));
    $('progressValue').textContent = progress + '%';

    if (result.next_role) {
      $('progressLabel').textContent = 'Progres menuju ' + (labels[result.next_role] || result.next_role);
      $('nextCopy').textContent = Number(result.orders_to_next || 0) > 0
        ? 'Selesaikan ' + Number(result.orders_to_next).toLocaleString('id-ID') + ' pesanan lagi untuk mencapai ' + (labels[result.next_role] || result.next_role) + '.'
        : 'Target pesanan untuk tingkatan berikutnya telah tercapai. Pembaruan level mengikuti sinkronisasi sistem.';
    } else {
      $('progressLabel').textContent = 'Tingkatan tertinggi';
      $('nextCopy').textContent = 'Kamu telah mencapai WARGA SULTAN. Terima kasih sudah menjadi bagian dari MATTHEW.';
    }

    renderHistory(Array.isArray(result.history) ? result.history : []);
    $('state').hidden = true;
    $('content').hidden = false;
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
      console.error('[Membership History]',error);
      showError(error?.message || 'Riwayat membership belum dapat dimuat. Coba muat ulang halaman.');
    });
  });
})();
