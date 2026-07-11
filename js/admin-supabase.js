(function () {
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
    if (!tbody || !requests) {
      return;
    }

    tbody.innerHTML = requests
      .map((request) => {
        const date = new Date(request.created_at).toISOString().slice(0, 10);
        return `
          <tr>
            <td>#${String(request.id).padStart(6, "0")}</td>
            <td>${request.name || "-"}</td>
            <td>${request.request_type || "-"}</td>
            <td><span class="badge received">${request.status || "received"}</span></td>
            <td>${date}</td>
          </tr>
        `;
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", loadAdminData);
})();
