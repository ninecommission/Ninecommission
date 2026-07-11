(function () {
  const page = document.body.dataset.adminPage;
  const labels = {
    dashboard: "대시보드",
    requests: "신청 관리",
    notices: "공지 관리",
    gallery: "갤러리 관리",
    settings: "설정",
    logs: "로그 관리",
  };
  const icons = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path></svg>',
    requests: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"></path><path d="M8 9h8"></path><path d="M8 14h5"></path></svg>',
    notices: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 18-5v12L3 13z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>',
    gallery: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10.5" r="1.5"></circle><path d="m21 15-5-5L5 19"></path></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"></circle><path d="M19 12h3M2 12h3M12 2v3M12 19v3M17 7l2-2M5 19l2-2M17 17l2 2M5 5l2 2"></path></svg>',
    logs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>',
  };
  const links = {
    dashboard: "admin.html",
    requests: "admin-requests.html",
    notices: "admin-notices.html",
    gallery: "admin-gallery.html",
    settings: "admin-settings.html",
    logs: "admin-logs.html",
  };

  const sidebar = document.querySelector("[data-admin-sidebar]");
  if (sidebar) {
    sidebar.innerHTML = `<h1>Nine Admin</h1><nav class="admin-menu" aria-label="관리자 메뉴">${Object.keys(labels)
      .map((key) => `<a class="${key === page ? "active" : ""}" href="${links[key]}">${icons[key]}${labels[key]}</a>`)
      .join("")}</nav><a class="logout-link" href="index.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path></svg>사용자 페이지로</a>`;
  }

  const toast = document.querySelector("[data-toast]");
  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.adminToast);
    window.adminToast = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  document.querySelectorAll("[data-notify]").forEach((button) =>
    button.addEventListener("click", () => notify(button.dataset.notify)),
  );
  document.querySelectorAll(".switch").forEach((button) =>
    button.addEventListener("click", () => {
      button.classList.toggle("on");
      button.setAttribute("aria-pressed", String(button.classList.contains("on")));
    }),
  );

  const search = document.querySelector("[data-table-search]");
  if (search) {
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      document.querySelectorAll("[data-filter-row]").forEach((row) => {
        row.hidden = !row.textContent.toLowerCase().includes(query);
      });
    });
  }

  const status = document.querySelector("[data-status-filter]");
  if (status) {
    status.addEventListener("change", () => {
      document.querySelectorAll("[data-filter-row]").forEach((row) => {
        row.hidden = Boolean(status.value && row.dataset.status !== status.value);
      });
    });
  }

  const logList = document.querySelector("[data-log-list]");
  const clearLogsButton = document.querySelector("[data-clear-logs]");
  function updateLogState() {
    if (!logList) return;
    const count = logList.querySelectorAll("[data-log-item]").length;
    const emptyState = document.querySelector("[data-log-empty]");
    if (emptyState) emptyState.hidden = count > 0;
    if (clearLogsButton) clearLogsButton.disabled = count === 0;
  }
  if (logList) {
    logList.addEventListener("click", (event) => {
      const deleteButton = event.target.closest("[data-delete-log]");
      if (!deleteButton) return;
      deleteButton.closest("[data-log-item]")?.remove();
      updateLogState();
      notify("로그를 삭제했습니다.");
    });
  }
  if (clearLogsButton) {
    clearLogsButton.addEventListener("click", () => {
      logList?.querySelectorAll("[data-log-item]").forEach((item) => item.remove());
      updateLogState();
      notify("전체 로그를 삭제했습니다.");
    });
  }
  updateLogState();
})();
