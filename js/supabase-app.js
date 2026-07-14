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
  let currentSlotStatus = "";

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

  function applyCommissionAvailability(slotStatus) {
    currentSlotStatus = slotStatus;
    const isResting = slotStatus === "휴식중";
    document.querySelectorAll('a[href="apply.html"]').forEach((link) => {
      link.classList.toggle("commission-closed", isResting);
      if (isResting) link.setAttribute("aria-disabled", "true");
      else link.removeAttribute("aria-disabled");
    });

    const form = document.querySelector("[data-supabase-form='commission']");
    if (!form) return;
    form.classList.toggle("is-closed", isResting);
    form.querySelectorAll("input, select, textarea, button[type='submit']").forEach((control) => {
      control.disabled = isResting;
    });
    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) submitButton.textContent = isResting ? "현재 휴식중입니다" : "커미션 신청하기";
    if (isResting) setStatus(form, "현재 휴식중이므로 커미션 신청을 받고 있지 않습니다.", "error");
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
    const statusLabels = { OPEN: "접수중", CLOSED: "준비중", REST: "휴식중", "쉬는 중": "휴식중" };
    const slotStatus = statusLabels[state.slot_status] || state.slot_status;
    applyCommissionAvailability(slotStatus);
    document.querySelectorAll(".status-card").forEach((card) => {
      const status = card.querySelector(".status-top span");
      const count = card.querySelector(":scope > strong");
      const bar = card.querySelector(".progress span");
      const period = card.querySelector("p b");
      if (status) {
        status.textContent = slotStatus;
        status.classList.toggle("status-preparing", slotStatus === "준비중");
        status.classList.toggle("status-resting", slotStatus === "휴식중");
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
    const lookupForm = document.querySelector("[data-status-lookup-form]");
    const lookupMessage = document.querySelector("[data-status-lookup-message]");
    if (lookupForm && state.status_lookup_enabled === false) {
      lookupForm.hidden = true;
      if (lookupMessage) lookupMessage.textContent = "현재 진행 상황 조회를 사용하지 않습니다.";
    }
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

    const referenceInput = form.querySelector('input[name="reference"]');
    const referenceCount = form.querySelector("[data-reference-count]");
    let selectedReferenceFiles = [];
    const emptyReferenceText = "선택된 이미지 없음 · 여러 번 나누어 선택 가능";

    referenceInput?.addEventListener("change", () => {
      const incomingFiles = Array.from(referenceInput.files || []);
      const selectedKeys = new Set(selectedReferenceFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      incomingFiles.forEach((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (!selectedKeys.has(key)) {
          selectedKeys.add(key);
          selectedReferenceFiles.push(file);
        }
      });

      if (typeof DataTransfer !== "undefined") {
        try {
          const transfer = new DataTransfer();
          selectedReferenceFiles.forEach((file) => transfer.items.add(file));
          referenceInput.files = transfer.files;
        } catch (error) {
          // Some mobile browsers do not allow replacing FileList. The saved array still uploads every selected file.
        }
      }

      const count = selectedReferenceFiles.length;
      if (referenceCount) {
        referenceCount.textContent = count ? `${count}장 선택됨` : emptyReferenceText;
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (currentSlotStatus === "휴식중") {
        setStatus(form, "현재 휴식중이므로 커미션 신청을 받을 수 없습니다.", "error");
        return;
      }
      const values = getFormData(form);

      setStatus(form, "신청을 저장하는 중입니다.", "loading");

      const files = selectedReferenceFiles.length
        ? selectedReferenceFiles
        : Array.from(referenceInput?.files || []);
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
      selectedReferenceFiles = [];
      if (referenceCount) referenceCount.textContent = emptyReferenceText;
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

  function bindStatusLookup() {
    const form = document.querySelector("[data-status-lookup-form]");
    if (!form) return;
    const message = document.querySelector("[data-status-lookup-message]");
    const result = document.querySelector("[data-status-lookup-result]");
    const statusLabels = { received: "접수 완료", waiting: "입금 대기", progress: "진행 중", done: "완료" };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      result.hidden = true;
      message.textContent = "신청 정보를 확인하는 중입니다.";
      if (!client) { message.textContent = "조회 서비스에 연결하지 못했습니다."; return; }
      const values = getFormData(form);
      const { data, error } = await client.rpc("lookup_commission_status", {
        p_request_id: Number(values.request_id),
        p_email: values.email || "",
      });
      if (error) { message.textContent = "조회하지 못했습니다. 잠시 후 다시 시도해주세요."; return; }
      const item = Array.isArray(data) ? data[0] : data;
      if (!item) { message.textContent = "일치하는 신청을 찾지 못했습니다. 신청 번호와 이메일을 확인해주세요."; return; }
      document.querySelector("[data-status-result-id]").textContent = `#${item.request_id}`;
      document.querySelector("[data-status-result-type]").textContent = item.request_type || "-";
      document.querySelector("[data-status-result-status]").textContent = statusLabels[item.status] || item.status || "-";
      document.querySelector("[data-status-result-date]").textContent = new Date(item.created_at).toLocaleDateString("ko-KR");
      message.textContent = "신청 상태를 확인했습니다.";
      result.hidden = false;
    });
  }

  window.NineSupabase = {
    getClient,
    insert,
    isReady,
    applyProfileSettings,
  };

  loadCachedProfile();
  document.addEventListener("DOMContentLoaded", () => {
    loadCachedProfile();
    setTimeout(loadCachedProfile, 0);
    bindApplyForm();
    bindInquiryForm();
    bindStatusLookup();
    loadPublicState();
    loadPublicNotices();
    bindNoticeModal();
    loadHomeNotices();
    subscribeToPublicNotices();
    loadPublicGallery();
  });
})();
