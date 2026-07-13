(function () {
  function escapeHtml(value) {
    const element = document.createElement("span");
    element.textContent = value || "";
    return element.innerHTML;
  }

  async function loadDashboardNotices(client) {
    const noticeList = document.querySelector("[data-admin-notices]");
    if (!noticeList) return;
    const { data: notices } = await client.from("notices").select("title,created_at,published").order("created_at", { ascending: false }).limit(3);
    noticeList.innerHTML = notices?.length
      ? notices.map((notice) => `<li><span>${escapeHtml(notice.title)}</span><time>${new Date(notice.created_at).toLocaleDateString("ko-KR")}</time><b>${notice.published ? "게시중" : "비공개"}</b></li>`).join("")
      : "<li><span>등록된 공지가 없습니다.</span></li>";
  }

  async function loadAdminData() {
    const api = window.NineSupabase;
    const client = api && api.getClient ? api.getClient() : null;

    if (!client) {
      document.body.dataset.supabase = "not-configured";
      return;
    }

    const { data: requests } = await client
      .from("commission_requests")
      .select("id,name,request_type,status,created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    const tbody = document.querySelector("[data-admin-requests]");
    if (!tbody || !requests) return;

    tbody.innerHTML = requests
      .map((request) => {
        const date = new Date(request.created_at).toISOString().slice(0, 10);
        return `
          <tr>
            <td>#${String(request.id).padStart(6, "0")}</td>
            <td>${escapeHtml(request.name || "-")}</td>
            <td>${escapeHtml(request.request_type || "-")}</td>
            <td><span class="badge received">${escapeHtml(request.status || "received")}</span></td>
            <td>${date}</td>
          </tr>
        `;
      })
      .join("");

    const { count: total } = await client.from("commission_requests").select("id", { count: "exact", head: true });
    const { count: progress } = await client.from("commission_requests").select("id", { count: "exact", head: true }).eq("status", "progress");
    const { count: done } = await client.from("commission_requests").select("id", { count: "exact", head: true }).eq("status", "done");
    const totalMetric = document.querySelector(".metric-card.purple strong");
    const progressMetric = document.querySelector(".metric-card.blue strong");
    const doneMetric = document.querySelector(".metric-card.green strong");
    if (totalMetric) totalMetric.textContent = total || 0;
    if (progressMetric) progressMetric.textContent = progress || 0;
    if (doneMetric) doneMetric.textContent = done || 0;

    const { data: settings } = await client.from("site_settings").select("total_slots,used_slots").eq("id", 1).single();
    if (settings) {
      const slotMetric = document.querySelector(".metric-card.orange strong");
      const slotPanelCount = document.querySelector(".slot-panel > strong");
      const slotBar = document.querySelector(".slot-bar span");
      const slotText = document.querySelector(".slot-panel small");
      const percent = settings.total_slots ? Math.round((settings.used_slots / settings.total_slots) * 100) : 0;
      if (slotMetric) slotMetric.textContent = `${settings.used_slots} / ${settings.total_slots}`;
      if (slotPanelCount) slotPanelCount.textContent = `${settings.used_slots} / ${settings.total_slots}`;
      if (slotBar) slotBar.style.width = `${percent}%`;
      if (slotText) slotText.textContent = `${percent}% 사용 중`;
    }

    await loadDashboardNotices(client);
    client
      .channel("admin-dashboard-notices")
      .on("postgres_changes", { event: "*", schema: "public", table: "notices" }, () => loadDashboardNotices(client))
      .subscribe();
  }

  document.addEventListener("DOMContentLoaded", loadAdminData);
})();
