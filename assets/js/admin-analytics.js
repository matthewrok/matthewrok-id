(() => {
  const TIME_ZONE = "Asia/Jakarta";
  const PAGE_SIZE = 1000;
  const MAX_ROWS = 10000;
  const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
  const number = value => new Intl.NumberFormat("id-ID").format(Number(value) || 0);
  const dateParts = value => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date(value));
    return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  };
  const dayKey = value => {
    const parts = dateParts(value);
    return parts.year + "-" + parts.month + "-" + parts.day;
  };
  function buildDays(now) {
    const today = dateParts(now);
    const cursor = new Date(Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day)));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(cursor);
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: new Intl.DateTimeFormat("id-ID", { timeZone: TIME_ZONE, weekday: "short" }).format(date),
        full: new Intl.DateTimeFormat("id-ID", { timeZone: TIME_ZONE, dateStyle: "medium" }).format(date)
      };
    });
  }
  async function fetchRows(client, table, columns) {
    const rows = [];
    for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
      const end = Math.min(offset + PAGE_SIZE, MAX_ROWS) - 1;
      const result = await client.from(table)
        .select(columns)
        .order(table === "joki_progress" ? "created_at" : "visited_at", { ascending: false })
        .range(offset, end);
      if (result.error) throw result.error;
      const page = result.data || [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) return { rows, truncated: false };
    }
    return { rows, truncated: true };
  }
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
      const [ordersResult, visitorsResult] = await Promise.all([
        fetchRows(client, "joki_progress", "status,total_price,discount_amount,quantity,created_at"),
        fetchRows(client, "visitor_logs", "visited_at")
      ]);
      const orders = ordersResult.rows;
      const visitors = visitorsResult.rows;
      const completed = orders.filter(row => row.status === "Selesai");
      const revenue = completed.reduce((sum, row) => sum + (Number(row.total_price) || 0), 0);
      const discount = orders.reduce((sum, row) => sum + (Number(row.discount_amount) || 0), 0);
      const average = orders.length ? orders.reduce((sum, row) => sum + (Number(row.total_price) || 0), 0) / orders.length : 0;
      const quantity = completed.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      document.getElementById(ids[0]).textContent = money(revenue);
      document.getElementById(ids[1]).textContent = money(average);
      document.getElementById(ids[2]).textContent = money(discount);
      document.getElementById(ids[3]).textContent = number(quantity);
      const days = buildDays(new Date());
      const orderCounts = new Map(days.map(day => [day.key, 0]));
      const visitorCounts = new Map(days.map(day => [day.key, 0]));
      orders.forEach(row => { const key = dayKey(row.created_at); if (orderCounts.has(key)) orderCounts.set(key, orderCounts.get(key) + 1); });
      visitors.forEach(row => { const key = dayKey(row.visited_at); if (visitorCounts.has(key)) visitorCounts.set(key, visitorCounts.get(key) + 1); });
      renderBars(document.getElementById("analyticsOrdersChart"), days, days.map(day => orderCounts.get(day.key)), "pesanan");
      renderBars(document.getElementById("analyticsVisitorsChart"), days, days.map(day => visitorCounts.get(day.key)), "kunjungan");
      const capped = ordersResult.truncated || visitorsResult.truncated;
      status.textContent = "Diperbarui " + new Intl.DateTimeFormat("id-ID", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(new Date()) +
        (capped ? " · Data dibatasi pada 10.000 baris terbaru per sumber; total dapat belum mencakup seluruh riwayat." : " · Seluruh riwayat yang tersedia telah dimuat.");
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