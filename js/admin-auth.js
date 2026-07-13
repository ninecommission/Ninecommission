(function () {
  const api = window.NineSupabase;
  const client = api?.getClient?.();
  const isLoginPage = location.pathname.endsWith("admin-login.html");
  function getSafeNextPage() {
    const next = new URLSearchParams(location.search).get("next") || "admin.html";
    return /^admin(?:-[a-z]+)?\.html$/.test(next) && next !== "admin-login.html" ? next : "admin.html";
  }

  async function hasAdminAccess(userId) {
    if (!userId) return false;
    const { data, error } = await client.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
    return !error && Boolean(data);
  }

  async function rejectNonAdmin(statusElement) {
    await client.auth.signOut();
    if (statusElement) {
      statusElement.textContent = "관리자 권한이 등록되지 않은 계정입니다.";
      return;
    }
    location.replace("admin-login.html?error=unauthorized");
  }

  async function start() {
    const loginStatus = document.querySelector("[data-login-status]");
    if (!client) {
      if (isLoginPage) loginStatus.textContent = "Supabase 연결 설정을 확인해주세요.";
      return;
    }
    if (isLoginPage && new URLSearchParams(location.search).get("error") === "unauthorized") {
      loginStatus.textContent = "관리자 권한이 등록되지 않은 계정입니다.";
    }
    const { data: { session } } = await client.auth.getSession();
    if (!isLoginPage && !session) {
      location.replace(`admin-login.html?next=${encodeURIComponent(location.pathname.split("/").pop() || "admin.html")}`);
      return;
    }
    if (session && !(await hasAdminAccess(session.user.id))) {
      await rejectNonAdmin(isLoginPage ? loginStatus : null);
      return;
    }
    if (isLoginPage && session) {
      location.replace(getSafeNextPage());
      return;
    }
    document.body.classList.add("admin-authenticated");
    document.querySelectorAll("[data-admin-logout]").forEach((link) => link.addEventListener("click", async (event) => {
      event.preventDefault();
      await client.auth.signOut();
      location.replace("admin-login.html");
    }));
  }

  document.querySelector("[data-admin-login]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector("[data-login-status]");
    if (!client) { status.textContent = "Supabase 연결 설정을 확인해주세요."; return; }
    status.textContent = "로그인 중입니다.";
    const { data, error } = await client.auth.signInWithPassword({ email: form.email.value, password: form.password.value });
    if (error) { status.textContent = "이메일 또는 비밀번호를 확인해주세요."; return; }
    if (!(await hasAdminAccess(data.user?.id))) {
      await rejectNonAdmin(status);
      return;
    }
    location.replace(getSafeNextPage());
  });
  start();
})();
