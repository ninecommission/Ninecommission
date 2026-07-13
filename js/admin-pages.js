(function () {
  document.title = document.title.replace("Nine Admin", "Nine");
  const page = document.body.dataset.adminPage;
  const labels = {
    dashboard: "대시보드",
    requests: "신청 관리",
    notices: "공지 관리",
    gallery: "갤러리 관리",
    chats: "채팅 관리",
    settings: "설정",
    logs: "로그 관리",
  };
  const icons = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path></svg>',
    requests: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"></path><path d="M8 9h8"></path><path d="M8 14h5"></path></svg>',
    notices: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 18-5v12L3 13z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>',
    gallery: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10.5" r="1.5"></circle><path d="m21 15-5-5L5 19"></path></svg>',
    chats: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.3 9.4 9.4 0 0 1-3.4-.6L3 21l1.8-4.5A7.7 7.7 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.3 8.5 8.5 0 0 1 9 8.3"></path></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"></path><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 1 1-4 0v-.09A1.8 1.8 0 0 0 8.8 19.3a1.8 1.8 0 0 0-1.98.36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.35 15a1.8 1.8 0 0 0-1.65-1.1H2.6a2 2 0 1 1 0-4h.09A1.8 1.8 0 0 0 4.3 8.8a1.8 1.8 0 0 0-.36-1.98l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.8 1.8 0 0 0 8.8 4.35a1.8 1.8 0 0 0 1.1-1.65V2.6a2 2 0 1 1 4 0v.09A1.8 1.8 0 0 0 15 4.3a1.8 1.8 0 0 0 1.98-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.8 1.8 0 0 0 19.65 8.8a1.8 1.8 0 0 0 1.65 1.1h.1a2 2 0 1 1 0 4h-.09A1.8 1.8 0 0 0 19.4 15z"></path></svg>',
    logs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path></svg>',
  };
  const links = {
    dashboard: "admin.html",
    requests: "admin-requests.html",
    notices: "admin-notices.html",
    gallery: "admin-gallery.html",
    chats: "admin-chats.html",
    settings: "admin-settings.html",
    logs: "admin-logs.html",
  };

  const sidebar = document.querySelector("[data-admin-sidebar]");
  if (sidebar) {
    sidebar.innerHTML = `<div class="admin-profile"><div class="admin-profile-avatar" aria-hidden="true"></div><div><small>ADMIN</small><strong>Nine</strong></div></div><nav class="admin-menu" aria-label="관리자 메뉴">${Object.keys(labels)
      .map((key) => `<a class="${key === page ? "active" : ""}" href="${links[key]}">${icons[key]}${labels[key]}</a>`)
      .join("")}</nav><a class="logout-link" href="admin-login.html" data-admin-logout><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path></svg>로그아웃</a>`;
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

})();
