(function () {
  const PROFILE_CACHE_KEY = "nine-profile-settings";
  const config = window.NINE_SUPABASE_CONFIG || {};
  const isReady =
    config.enabled &&
    config.url &&
    config.anonKey &&
    !config.url.includes("YOUR_PROJECT_ID") &&
    !config.anonKey.includes("YOUR_SUPABASE_ANON_KEY") &&
    window.supabase;

  const client = isReady ? window.supabase.createClient(config.url, config.anonKey) : null;

  function getClient() {
    return client;
  }

  function getFormData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function setStatus(form, message, type) {
    let status = form.querySelector("[data-form-status]");

    if (!status) {
      status = document.createElement("p");
      status.dataset.formStatus = "";
      status.className = "form-status";
      form.appendChild(status);
    }

    status.textContent = message;
    status.dataset.type = type;
  }

  async function insert(table, payload) {
    if (!client) {
      return { data: null, error: new Error("Supabase is not configured.") };
    }

    return client.from(table).insert(payload).select().single();
  }

  async function loadPublicState() {
    if (!client) return;
    const rpcResult = await client.rpc("get_public_site_state");
    let state = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    if (rpcResult.error || !state) {
      const fallback = await client.from("site_settings").select("slot_status,total_slots,used_slots,average_period,profile_image_url,profile_image_scale,profile_image_x,profile_image_y,status_lookup_enabled").eq("id", 1).single();
      state = fallback.data;
    }
    if (!state) return;
    const statusLabels = { OPEN: "접수중", CLOSED: "준비중", REST: "접수중", "쉬는 중": "접수중" };
    const slotStatus = statusLabels[state.slot_status] || state.slot_status;
    document.querySelectorAll(".status-card").forEach((card) => {
      const status = card.querySelector(".status-top span");
      const count = card.querySelector(":scope > strong");
      const bar = card.querySelector(".progress span");
      const period = card.querySelector("p b");
      if (status) {
        status.textContent = slotStatus;
        status.classList.toggle("status-preparing", slotStatus === "준비중");
      }
      if (count) count.textContent = `${state.used_slots} / ${state.total_slots}`;
      if (bar) bar.style.width = state.total_slots ? `${(state.used_slots / state.total_slots) * 100}%` : "0%";
      if (period) period.textContent = state.average_period || "-";
      card.classList.add("is-ready");
    });
    const publicSlotCount = document.querySelector("[data-public-slot-count]");
    const publicSlotStatus = document.querySelector("[data-public-slot-status]");
    if (publicSlotCount) publicSlotCount.textContent = `${state.used_slots} / ${state.total_slots}`;
    if (publicSlotStatus) publicSlotStatus.textContent = `현재 커미션은 ${slotStatus} 상태입니다.`;
    document.querySelectorAll('a[href="status.html"]').forEach((link) => {
      link.hidden = state.status_lookup_enabled === false;
    });
    const cachedProfile = getCachedProfile();
    if (cachedProfile?.profile_local_override) {
      applyProfileSettings(cachedProfile);
    } else {
      applyProfileSettings(state);
      try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(state)); } catch (error) {}
    }
  }

  function applyProfileSettings(state) {
    if (!state?.profile_image_url) return;
    const scale = Math.min(140, Math.max(70, Number(state.profile_image_scale) || 100));
    document.querySelectorAll(".avatar, .chat-avatar, .admin-profile-avatar").forEach((avatar) => {
      avatar.style.backgroundImage = `url("${state.profile_image_url}")`;
      avatar.style.backgroundSize = scale === 100 ? "cover" : `${scale}%`;
      avatar.style.backgroundPosition = `${state.profile_image_x ?? 50}% ${state.profile_image_y ?? 50}%`;
      avatar.style.backgroundRepeat = "no-repeat";
      avatar.style.imageRendering = "auto";
    });
  }

  function getCachedProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY)); } catch (error) { return null; }
  }

  function loadCachedProfile() {
    applyProfileSettings(getCachedProfile());
  }

  async function loadPublicNotices() {
    const list = document.querySelector("[data-public-notices]");
    if (!client || !list) return;
    const { data, error } = await client.from("notices").select("id,title,content,created_at").eq("published", true).order("created_at", { ascending: false });
    if (error) return;
    list.innerHTML = data.length ? data.map((item) => `<article><button class="notice-open" type="button" data-notice-open><time>${new Date(item.created_at).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}</time><div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.content)}</p></div></button></article>`).join("") : '<p class="empty-state">등록된 공지가 없습니다.</p>';
  }

  function bindNoticeModal() {
    const list = document.querySelector("[data-public-notices]");
    const modal = document.querySelector("[data-notice-modal]");
    if (!list || !modal) return;
    const title = modal.querySelector("[data-notice-modal-title]");
    const date = modal.querySelector("[data-notice-modal-date]");
    const content = modal.querySelector("[data-notice-modal-content]");

    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-notice-open]");
      if (!button) return;
      title.textContent = button.querySelector("h2")?.textContent || "공지사항";
      date.textContent = button.querySelector("time")?.textContent || "";
      content.textContent = button.querySelector("p")?.textContent || "";
      modal.showModal();
    });
    modal.querySelector("[data-notice-modal-close]")?.addEventListener("click", () => modal.close());
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.close();
    });
  }

  async function loadHomeNotices() {
    const list = document.querySelector("[data-home-notices]");
    if (!client || !list) return;
    const { data, error } = await client.from("notices").select("title,created_at").eq("published", true).order("created_at", { ascending: false }).limit(3);
    if (error) return;
    list.innerHTML = data.length ? data.map((item) => `<li><span>${escapeHtml(item.title)}</span><time>${new Date(item.created_at).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}</time></li>`).join("") : "<li><span>등록된 공지가 없습니다.</span></li>";
  }

  function subscribeToPublicNotices() {
    if (!client || (!document.querySelector("[data-public-notices]") && !document.querySelector("[data-home-notices]"))) return;
    client
      .channel(`public-notices-${window.location.pathname}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notices" }, () => {
        loadPublicNotices();
        loadHomeNotices();
      })
      .subscribe();
  }

  function escapeHtml(value) {
    const element = document.createElement("span");
    element.textContent = value || "";
    return element.innerHTML;
  }

  async function loadPublicGallery() {
    const grid = document.querySelector("[data-public-gallery]");
    if (!client || !grid) return;
    const { data, error } = await client.from("gallery_items").select("id,title,category,price,description,image_url").eq("published", true).order("created_at", { ascending: false });
    if (error) return;
    grid.innerHTML = data.length ? data.map((item) => `<article class="sample-card gallery-item" data-type="${escapeHtml(item.category)}" data-title="${escapeHtml(item.title)}" data-price="${escapeHtml(item.price)}" data-desc="${escapeHtml(item.description)}"><button class="gallery-open" type="button"><div class="sample-image" style="background-image:url('${encodeURI(item.image_url)}');background-size:cover;background-position:center"></div><div class="sample-info"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.price)}</span><p>${escapeHtml(item.description)}</p></div></button></article>`).join("") : '<p class="empty-state">등록된 샘플이 없습니다.</p>';
    window.NineGalleryRefresh?.();
  }

  function bindApplyForm() {
    const form = document.querySelector("[data-supabase-form='commission']");
    if (!form) {
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = getFormData(form);

      setStatus(form, "신청을 저장하는 중입니다.", "loading");

      const files = Array.from(form.querySelector('[name="reference"]')?.files || []);
      const referencePaths = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await client.storage.from("request-files").upload(path, file);
        if (uploadError) {
          setStatus(form, "참고 이미지를 업로드하지 못했습니다.", "error");
          return;
        }
        referencePaths.push(path);
      }

      const { error } = await insert("commission_requests", {
        name: values.name || "",
        email: values.email || "",
        contact: values.contact || "",
        request_type: values.type || "",
        people: values.people || "",
        usage: values.usage || "",
        message: values.message || "",
        status: "received",
        reference_paths: referencePaths,
      });

      if (error) {
        setStatus(form, "Supabase 설정을 확인해주세요. 신청이 저장되지 않았습니다.", "error");
        return;
      }

      form.reset();
      setStatus(form, "신청이 저장되었습니다.", "success");
      loadPublicState();
    });
  }

  function bindInquiryForm() {
    const form = document.querySelector("[data-supabase-form='inquiry']");
    if (!form) {
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = getFormData(form);

      setStatus(form, "문의를 저장하는 중입니다.", "loading");

      const { error } = await insert("inquiries", {
        name: values.name || "",
        contact: values.contact || values.email || "",
        message: values.message || "",
      });

      if (error) {
        setStatus(form, "Supabase 설정을 확인해주세요. 문의가 저장되지 않았습니다.", "error");
        return;
      }

      form.reset();
      setStatus(form, "문의가 저장되었습니다.", "success");
    });
  }

  window.NineSupabase = {
    getClient,
    insert,
    isReady,
    applyProfileSettings,
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadCachedProfile();
    setTimeout(loadCachedProfile, 0);
    bindApplyForm();
    bindInquiryForm();
    loadPublicState();
    loadPublicNotices();
    bindNoticeModal();
    loadHomeNotices();
    subscribeToPublicNotices();
    loadPublicGallery();
  });
})();
