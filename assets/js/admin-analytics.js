(() => {
  const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
  const number = value => new Intl.NumberFormat("id-ID").format(Number(value) || 0);
  const dayKey = date => {
    const d = new Date(date);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  };
  function renderBars(target, days, values, label) {
    if (!target) return;
    const max = Math.max(1, ...values);
    target.replaceChildren();
    days.forEach((day, index) => {
      const item = document.createElement("div");
      item.className = "analytics-bar-item";
      const value = document.createElement("strong");
      value.textContent = number(values[index]);
      const track = document.createElement("div");
      track.className = "analytics-bar-track";
      const fill = document.createElement("span");
      fill.className = "analytics-bar-fill";
      fill.style.height = Math.max(values[index] > 0 ? 8 : 0, values[index] / max * 100) + "%";
      track.append(fill);
      const caption = document.createElement("small");
      caption.textContent = day.label;
      item.title = day.full + ": " + number(values[index]) + " " + label;
      item.append(value, track, caption);
      target.append(item);
    });
  }
  window.refreshAdminAnalytics = async client => {
    const status = document.getElementById("analyticsUpdated");
    const ids = ["analyticsRevenue", "analyticsAverage", "analyticsDiscount", "analyticsQuantity"];
    try {
      const results = await Promise.all([
        client.from("joki_progress").select("status,total_price,discount_amount,quantity,created_at").order("created_at", { ascending: false }).limit(10000),
        client.from("visitor_logs").select("visited_at").order("visited_at", { ascending: false }).limit(10000)
      ]);
      const ordersResult = results[0];
      const visitorsResult = results[1];
      if (ordersResult.error) throw ordersResult.error;
      if (visitorsResult.error) console.warn("Analitik kunjungan tidak tersedia:", visitorsResult.error.message);
      const orders = ordersResult.data || [];
      const completed = orders.filter(row => row.status === "Selesai");
      const revenue = completed.reduce((sum, row) => sum + (Number(row.total_price) || 0), 0);
      const discount = orders.reduce((sum, row) => sum + (Number(row.discount_amount) || 0), 0);
      const average = orders.length ? orders.reduce((sum, row) => sum + (Number(row.total_price) || 0), 0) / orders.length : 0;
      const quantity = completed.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      document.getElementById(ids[0]).textContent = money(revenue);
      document.getElementById(ids[1]).textContent = money(average);
      document.getElementById(ids[2]).textContent = money(discount);
      document.getElementById(ids[3]).textContent = number(quantity);
      const now = new Date();
      const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(now);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        return { key: dayKey(date), label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date), full: new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date) };
      });
      const orderCounts = new Map(days.map(day => [day.key, 0]));
      const visitorCounts = new Map(days.map(day => [day.key, 0]));
      orders.forEach(row => { const key = dayKey(row.created_at); if (orderCounts.has(key)) orderCounts.set(key, orderCounts.get(key) + 1); });
      (visitorsResult.data || []).forEach(row => { const key = dayKey(row.visited_at); if (visitorCounts.has(key)) visitorCounts.set(key, visitorCounts.get(key) + 1); });
      renderBars(document.getElementById("analyticsOrdersChart"), days, days.map(day => orderCounts.get(day.key)), "pesanan");
      renderBars(document.getElementById("analyticsVisitorsChart"), days, days.map(day => visitorCounts.get(day.key)), "kunjungan");
      status.textContent = "Diperbarui " + new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date()) + " · Maksimal 10.000 baris terbaru per sumber.";
    } catch (error) {
      console.error("Admin analytics error:", error);
      ids.forEach(id => { const node = document.getElementById(id); if (node) node.textContent = "—"; });
      if (status) status.textContent = "Analitik belum tersedia. Periksa akses admin dan kolom data pesanan.";
      ["analyticsOrdersChart", "analyticsVisitorsChart"].forEach(id => {
        const node = document.getElementById(id);
        if (node) { const message = document.createElement("span"); message.className = "analytics-empty"; message.textContent = "Data grafik belum tersedia."; node.replaceChildren(message); }
      });
    }
  };
})();