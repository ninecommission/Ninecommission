(function () {
  const client = window.NineSupabase?.getClient?.();
  const page = document.body.dataset.adminPage;
  let currentProfileImageUrl = "";
  if (!client || !page) return;

  const toast = (message) => {
    const element = document.querySelector("[data-toast]");
    if (!element) return;
    element.textContent = message; element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 1800);
  };
  const esc = (value) => { const span = document.createElement("span"); span.textContent = value || ""; return span.innerHTML; };
  function getStoragePath(publicUrl, bucket) {
    if (!publicUrl) return "";
    try {
      const marker = `/storage/v1/object/public/${bucket}/`;
      const pathname = new URL(publicUrl).pathname;
      const index = pathname.indexOf(marker);
      return index >= 0 ? decodeURIComponent(pathname.slice(index + marker.length)) : "";
    } catch (error) {
      return "";
    }
  }
  async function log(action, detail) {
    const { data: { user } } = await client.auth.getUser();
    await client.from("admin_logs").insert({ actor: user?.email || "admin", action, detail: detail || "" });
  }

  function modal(title, fields, submitText, onSubmit) {
    const dialog = document.createElement("dialog");
    dialog.className = "admin-dialog";
    dialog.innerHTML = `<form method="dialog" class="admin-form"><header><h2>${title}</h2><button type="button" data-dialog-close aria-label="닫기">×</button></header>${fields}<p data-dialog-status></p><div class="page-actions"><button class="admin-button" type="button" data-dialog-close>취소</button><button class="admin-button primary" type="submit" value="submit">${submitText}</button></div></form>`;
    document.body.appendChild(dialog);
    const form = dialog.querySelector("form");
    dialog.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", () => dialog.close()));
    form.addEventListener("submit", async (event) => {
      if (event.submitter?.value === "cancel") return;
      event.preventDefault();
      const status = form.querySelector("[data-dialog-status]"); status.textContent = "저장 중입니다.";
      try { await onSubmit(new FormData(form)); dialog.close(); dialog.remove(); } catch (error) { status.textContent = error.message || "저장하지 못했습니다."; }
    });
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();
  }

  async function showRequestImages(requestId) {
    const { data: request, error: requestError } = await client
      .from("commission_requests")
      .select("reference_paths")
      .eq("id", requestId)
      .single();
    if (requestError) return toast("참고 이미지를 불러오지 못했습니다.");

    const paths = request?.reference_paths || [];
    if (!paths.length) return toast("등록된 참고 이미지가 없습니다.");

    const signedImages = await Promise.all(paths.map(async (path) => {
      const { data, error } = await client.storage.from("request-files").createSignedUrl(path, 300);
      return error ? null : { path, url: data.signedUrl };
    }));
    const images = signedImages.filter(Boolean);
    if (!images.length) return toast("참고 이미지를 열지 못했습니다.");

    const dialog = document.createElement("dialog");
    dialog.className = "admin-dialog request-images-dialog";
    dialog.innerHTML = `<section class="request-images-panel"><header><div><h2>참고 이미지</h2><p>${images.length}장</p></div><button type="button" data-dialog-close aria-label="닫기">×</button></header><div class="request-images-grid"></div></section>`;
    const grid = dialog.querySelector(".request-images-grid");
    images.forEach((image, index) => {
      const link = document.createElement("a");
      link.href = image.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute("aria-label", `참고 이미지 ${index + 1} 원본 보기`);
      const element = document.createElement("img");
      element.src = image.url;
      element.alt = `참고 이미지 ${index + 1}`;
      element.loading = "lazy";
      link.appendChild(element);
      grid.appendChild(link);
    });
    document.body.appendChild(dialog);
    dialog.querySelector("[data-dialog-close]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();
  }

  async function loadRequests() {
    const tbody = document.querySelector("tbody"); if (!tbody) return;
    const { data, error } = await client.from("commission_requests").select("*").order("created_at", { ascending: false });
    if (error) return;
    const statusLabels = { received: "접수 완료", waiting: "입금 대기", progress: "진행 중", done: "완료" };
    tbody.innerHTML = data.map((item) => {
      const currentStatus = statusLabels[item.status] ? item.status : "received";
      const options = Object.entries(statusLabels).map(([value, label]) => `<option value="${value}"${value === currentStatus ? " selected" : ""}>${label}</option>`).join("");
      return `<tr data-filter-row data-status="${currentStatus}"><td>#${item.id}</td><td>${esc(item.name)}</td><td>${esc(item.request_type)}</td><td>-</td><td><select class="request-status-select" data-request-status="${item.id}">${options}</select></td><td>${new Date(item.created_at).toLocaleDateString("ko-KR")}</td><td>${item.reference_paths?.length ? `<button class="admin-button" data-request-images="${item.id}">보기 (${item.reference_paths.length})</button>` : "-"}</td><td class="row-actions"><button data-request-delete="${item.id}">삭제</button></td></tr>`;
    }).join("");
    document.querySelector(".empty-state").hidden = data.length > 0;
  }

  async function loadNotices() {
    const list = document.querySelector(".notice-list"); if (!list) return;
    const { data } = await client.from("notices").select("*").order("created_at", { ascending: false });
    list.innerHTML = (data || []).map((item) => `<article class="notice-item" data-filter-row><div><h3>${esc(item.title)}</h3><p>${esc(item.content)}</p></div><span class="badge ${item.published ? "done" : "wait"}">${item.published ? "게시 중" : "비공개"}</span><button class="admin-button danger" data-notice-delete="${item.id}">삭제</button></article>`).join("");
    document.querySelector(".empty-state").hidden = Boolean(data?.length);
  }

  async function loadGallery() {
    const list = document.querySelector(".gallery-manage"); if (!list) return;
    const { data } = await client.from("gallery_items").select("*").order("created_at", { ascending: false });
    list.innerHTML = (data || []).map((item) => `<article class="gallery-tile" data-filter-row><div class="gallery-image" style="background-image:url('${encodeURI(item.image_url)}');background-size:cover;background-position:center"></div><div class="gallery-meta"><strong>${esc(item.title)}</strong><button class="admin-button danger" data-gallery-delete="${item.id}">삭제</button></div></article>`).join("");
    document.querySelector(".empty-state").hidden = Boolean(data?.length);
  }

  async function loadLogs() {
    const list = document.querySelector("[data-log-list]"); if (!list) return;
    const { data } = await client.from("admin_logs").select("*").order("created_at", { ascending: false });
    list.innerHTML = (data || []).map((item) => `<article class="log-item" data-filter-row data-log-item><div><strong>${esc(item.action)}</strong><p>${esc(item.detail)}</p></div><small>${new Date(item.created_at).toLocaleString("ko-KR")} · ${esc(item.actor)}</small><button class="admin-button danger" data-delete-log data-log-delete="${item.id}">삭제</button></article>`).join("");
    const empty = document.querySelector("[data-log-empty]"); if (empty) empty.hidden = Boolean(data?.length);
    const clear = document.querySelector("[data-clear-logs]"); if (clear) clear.disabled = !data?.length;
  }

  async function loadChats() {
    const list = document.querySelector("[data-chat-list]"); if (!list) return;
    const { data, error } = await client.from("chat_messages").select("id,created_at,page_path,sender,message").order("created_at", { ascending: false });
    if (error) return toast("채팅 문의를 불러오지 못했습니다.");
    list.innerHTML = (data || []).map((item) => `<article class="chat-manage-item" data-filter-row><div><p>${esc(item.message)}</p><div class="chat-manage-meta"><span>발신 코드: <strong>${esc(item.sender || "기존 방문자")}</strong></span><span>${new Date(item.created_at).toLocaleString("ko-KR")}</span><span>접수 페이지: ${esc(item.page_path || "-")}</span></div></div><button class="admin-button danger" data-chat-delete="${item.id}">삭제</button></article>`).join("");
    const empty = document.querySelector("[data-chat-empty]"); if (empty) empty.hidden = Boolean(data?.length);
    const clear = document.querySelector("[data-clear-chats]"); if (clear) clear.disabled = !data?.length;
  }

  async function loadInquiries() {
    const list = document.querySelector("[data-inquiry-list]"); if (!list) return;
    const { data, error } = await client.from("inquiries").select("id,created_at,name,contact,message").order("created_at", { ascending: false });
    if (error) return toast("문의를 불러오지 못했습니다.");
    list.innerHTML = (data || []).map((item) => `<article class="inquiry-manage-item" data-filter-row><div><h3>${esc(item.name || "이름 없음")}</h3><p>${esc(item.message)}</p><div class="inquiry-manage-meta"><span>${new Date(item.created_at).toLocaleString("ko-KR")}</span><span>연락처: ${esc(item.contact || "-")}</span></div></div><button class="admin-button danger" data-inquiry-delete="${item.id}">삭제</button></article>`).join("");
    const empty = document.querySelector("[data-inquiry-empty]"); if (empty) empty.hidden = Boolean(data?.length);
    const clear = document.querySelector("[data-clear-inquiries]"); if (clear) clear.disabled = !data?.length;
  }

  document.querySelector(".page-header .primary")?.addEventListener("click", () => {
    if (page === "requests") modal("신청 등록", '<div class="field"><label>이름</label><input name="name" required></div><div class="field"><label>연락처</label><input name="contact"></div><div class="field"><label>신청 타입</label><input name="request_type" required></div><div class="field"><label>참고 이미지</label><input name="reference" type="file" accept="image/*" multiple></div><div class="field"><label>내용</label><textarea name="message"></textarea></div>', "등록", async (data) => { const referencePaths = []; for (const file of data.getAll("reference").filter((item) => item.size)) { const path = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`; const uploaded = await client.storage.from("request-files").upload(path, file); if (uploaded.error) throw uploaded.error; referencePaths.push(path); } const payload = { name: data.get("name"), contact: data.get("contact"), request_type: data.get("request_type"), message: data.get("message"), reference_paths: referencePaths, status: "received" }; const { error } = await client.from("commission_requests").insert(payload); if (error) throw error; await log("신청 등록", payload.name); await loadRequests(); toast("신청을 등록했습니다."); });
    if (page === "notices") modal("새 공지 작성", '<div class="field"><label>제목</label><input name="title" required></div><div class="field"><label>내용</label><textarea name="content" required></textarea></div><label class="agree-row"><input type="checkbox" name="published" checked> 바로 게시</label>', "저장", async (data) => { const payload = Object.fromEntries(data); payload.published = data.has("published"); const { error } = await client.from("notices").insert(payload); if (error) throw error; await log("공지 작성", payload.title); await loadNotices(); toast("공지를 저장했습니다."); });
    if (page === "gallery") modal("샘플 업로드", '<div class="field"><label>제목</label><input name="title" required></div><div class="field"><label>분류</label><select name="category"><option value="sd">SD</option><option value="ld">LD</option><option value="extra">추가</option></select></div><div class="field"><label>가격</label><input name="price"></div><div class="field"><label>설명</label><textarea name="description"></textarea></div><div class="field"><label>이미지</label><input name="image" type="file" accept="image/*" required></div>', "업로드", async (data) => { const file = data.get("image"); const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`; const uploaded = await client.storage.from("gallery").upload(path, file); if (uploaded.error) throw uploaded.error; const { data: url } = client.storage.from("gallery").getPublicUrl(path); const payload = { title: data.get("title"), category: data.get("category"), price: data.get("price"), description: data.get("description"), image_url: url.publicUrl, published: true }; const { error } = await client.from("gallery_items").insert(payload); if (error) throw error; await log("샘플 업로드", payload.title); await loadGallery(); toast("샘플을 업로드했습니다."); });
  });

  document.addEventListener("click", async (event) => {
    const requestId = event.target.dataset.requestDelete;
    const noticeId = event.target.dataset.noticeDelete;
    const galleryId = event.target.dataset.galleryDelete;
    const logId = event.target.dataset.logDelete;
    const chatId = event.target.dataset.chatDelete;
    const inquiryId = event.target.dataset.inquiryDelete;
    const requestImagesId = event.target.dataset.requestImages;
    if (requestId) {
      if (!window.confirm(`신청 #${requestId}을(를) 삭제할까요? 삭제한 신청은 복구할 수 없습니다.`)) return;
      const { data: request } = await client.from("commission_requests").select("reference_paths").eq("id", requestId).single();
      const { error } = await client.from("commission_requests").delete().eq("id", requestId);
      if (error) return toast("신청을 삭제하지 못했습니다.");
      const paths = request?.reference_paths || [];
      const cleanup = paths.length ? await client.storage.from("request-files").remove(paths) : { error: null };
      await log("신청 삭제", `#${requestId}`);
      await loadRequests();
      toast(cleanup.error ? "신청은 삭제했지만 이미지 파일 정리에 실패했습니다." : "신청과 첨부 이미지를 삭제했습니다.");
    }
    if (noticeId) {
      if (!window.confirm("이 공지를 삭제할까요? 삭제한 공지는 복구할 수 없습니다.")) return;
      const { error } = await client.from("notices").delete().eq("id", noticeId);
      if (error) return toast("공지를 삭제하지 못했습니다.");
      await log("공지 삭제", `#${noticeId}`);
      await loadNotices();
      toast("공지를 삭제했습니다.");
    }
    if (galleryId) {
      if (!window.confirm("이 갤러리 샘플을 삭제할까요? 삭제한 샘플은 복구할 수 없습니다.")) return;
      const { data: galleryItem } = await client.from("gallery_items").select("image_url").eq("id", galleryId).single();
      const { error } = await client.from("gallery_items").delete().eq("id", galleryId);
      if (error) return toast("갤러리 샘플을 삭제하지 못했습니다.");
      const imagePath = getStoragePath(galleryItem?.image_url, "gallery");
      const cleanup = imagePath ? await client.storage.from("gallery").remove([imagePath]) : { error: null };
      await log("샘플 삭제", `#${galleryId}`);
      await loadGallery();
      toast(cleanup.error ? "샘플은 삭제했지만 이미지 파일 정리에 실패했습니다." : "갤러리 샘플과 이미지를 삭제했습니다.");
    }
    if (logId) {
      const { error } = await client.from("admin_logs").delete().eq("id", logId);
      if (error) return toast("로그를 삭제하지 못했습니다.");
      await loadLogs();
      toast("로그를 삭제했습니다.");
    }
    if (chatId) {
      if (!window.confirm("이 채팅 문의를 삭제할까요?")) return;
      const { error } = await client.from("chat_messages").delete().eq("id", chatId);
      if (error) return toast("채팅 문의를 삭제하지 못했습니다.");
      await log("채팅 문의 삭제", `#${chatId}`);
      await loadChats();
      toast("채팅 문의를 삭제했습니다.");
    }
    if (inquiryId) {
      if (!window.confirm("이 문의를 삭제할까요?")) return;
      const { error } = await client.from("inquiries").delete().eq("id", inquiryId);
      if (error) return toast("문의를 삭제하지 못했습니다.");
      await log("문의 삭제", `#${inquiryId}`);
      await loadInquiries();
      toast("문의를 삭제했습니다.");
    }
    if (requestImagesId) await showRequestImages(requestImagesId);
  });

  document.querySelector("[data-clear-logs]")?.addEventListener("click", async () => {
    if (!window.confirm("전체 로그를 삭제할까요? 삭제한 로그는 복구할 수 없습니다.")) return;
    const { error } = await client.from("admin_logs").delete().gte("id", 0);
    if (error) return toast("전체 로그를 삭제하지 못했습니다.");
    await loadLogs(); toast("전체 로그를 삭제했습니다.");
  });

  document.querySelector("[data-clear-chats]")?.addEventListener("click", async () => {
    if (!window.confirm("전체 채팅 문의를 삭제할까요? 삭제한 문의는 복구할 수 없습니다.")) return;
    const { error } = await client.from("chat_messages").delete().gte("id", 0);
    if (error) return toast("전체 채팅 문의를 삭제하지 못했습니다.");
    await log("전체 채팅 문의 삭제", "채팅 문의 전체 삭제");
    await loadChats();
    toast("전체 채팅 문의를 삭제했습니다.");
  });

  document.querySelector("[data-clear-inquiries]")?.addEventListener("click", async () => {
    if (!window.confirm("전체 문의를 삭제할까요? 삭제한 문의는 복구할 수 없습니다.")) return;
    const { error } = await client.from("inquiries").delete().gte("id", 0);
    if (error) return toast("전체 문의를 삭제하지 못했습니다.");
    await log("전체 문의 삭제", "문의 전체 삭제");
    await loadInquiries();
    toast("전체 문의를 삭제했습니다.");
  });

  document.addEventListener("change", async (event) => {
    const requestId = event.target.dataset.requestStatus;
    if (!requestId) return;
    const status = event.target.value;
    const allowed = ["received", "waiting", "progress", "done"];
    if (!allowed.includes(status)) return;
    const { error } = await client.from("commission_requests").update({ status }).eq("id", requestId);
    if (error) { await loadRequests(); return toast("신청 상태를 변경하지 못했습니다."); }
    await log("신청 상태 변경", `#${requestId} → ${status}`);
    await loadRequests();
    toast("신청 상태를 변경했습니다.");
  });

  function updateProfilePreview() {
    const preview = document.querySelector("[data-profile-preview]");
    const scale = Math.min(140, Math.max(70, Number(document.querySelector("[data-profile-scale]")?.value || 100)));
    const x = Number(document.querySelector("[data-profile-x]")?.value || 50);
    const y = Number(document.querySelector("[data-profile-y]")?.value || 50);
    if (preview) {
      preview.style.backgroundSize = scale === 100 ? "cover" : `${scale}%`;
      preview.style.backgroundPosition = `${x}% ${y}%`;
      preview.style.backgroundRepeat = "no-repeat";
    }
    const scaleValue = document.querySelector("[data-profile-scale-value]");
    const xValue = document.querySelector("[data-profile-x-value]");
    const yValue = document.querySelector("[data-profile-y-value]");
    if (scaleValue) scaleValue.textContent = `${scale}%`;
    if (xValue) xValue.textContent = `${x}%`;
    if (yValue) yValue.textContent = `${y}%`;
  }

  function readImageSize(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve({ width: image.naturalWidth, height: image.naturalHeight }); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지를 읽을 수 없습니다.")); };
      image.src = url;
    });
  }

  async function loadSettings() {
    const { data } = await client.from("site_settings").select("*").eq("id", 1).single(); if (!data) return;
    const statusLabels = { OPEN: "접수중", CLOSED: "준비중", REST: "휴식중", "쉬는 중": "휴식중" };
    const statusInput = document.querySelector("#status");
    const slotsInput = document.querySelector("#slots");
    const usedInput = document.querySelector("#used");
    const periodInput = document.querySelector("#period");
    if (statusInput) statusInput.value = statusLabels[data.slot_status] || data.slot_status;
    if (slotsInput) slotsInput.value = data.total_slots;
    if (usedInput) usedInput.value = data.used_slots;
    if (periodInput) periodInput.value = data.average_period;
    currentProfileImageUrl = data.profile_image_url || "";
    const preview = document.querySelector("[data-profile-preview]");
    if (preview && currentProfileImageUrl) preview.style.backgroundImage = `url("${currentProfileImageUrl}")`;
    const scaleInput = document.querySelector("[data-profile-scale]");
    const xInput = document.querySelector("[data-profile-x]");
    const yInput = document.querySelector("[data-profile-y]");
    if (scaleInput) scaleInput.value = Math.min(140, Math.max(70, Number(data.profile_image_scale) || 100));
    if (xInput) xInput.value = data.profile_image_x ?? 50;
    if (yInput) yInput.value = data.profile_image_y ?? 50;
    const statusLookupSwitch = document.querySelector("[data-status-lookup-enabled]");
    if (statusLookupSwitch) {
      const enabled = data.status_lookup_enabled !== false;
      statusLookupSwitch.classList.toggle("on", enabled);
      statusLookupSwitch.setAttribute("aria-pressed", String(enabled));
    }
    updateProfilePreview();
  }
  document.querySelector("[data-save-settings]")?.addEventListener("click", async () => {
    const profileFile = document.querySelector("[data-profile-image]")?.files?.[0];
    if (profileFile) {
      if (profileFile.size > 5 * 1024 * 1024) return toast("프로필 사진은 5MB 이하만 업로드할 수 있습니다.");
      const imageSize = await readImageSize(profileFile);
      if (imageSize.width < 400 || imageSize.height < 400) return toast("선명한 표시를 위해 가로·세로 400px 이상의 이미지를 사용해주세요.");
      const path = `profile-${Date.now()}-${profileFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const uploaded = await client.storage.from("profile").upload(path, profileFile);
      if (uploaded.error) return toast("프로필 사진을 업로드하지 못했습니다.");
      currentProfileImageUrl = client.storage.from("profile").getPublicUrl(path).data.publicUrl;
    }
    const payload = { profile_image_url: currentProfileImageUrl, profile_image_scale: Number(document.querySelector("[data-profile-scale]").value), profile_image_x: Number(document.querySelector("[data-profile-x]").value), profile_image_y: Number(document.querySelector("[data-profile-y]").value), status_lookup_enabled: document.querySelector("[data-status-lookup-enabled]")?.classList.contains("on") !== false, updated_at: new Date().toISOString() };
    let { error } = await client.from("site_settings").update(payload).eq("id", 1);
    let profileAdjustmentsLocalOnly = false;
    if (error && /profile_image_(scale|x|y)|schema cache|column/i.test(error.message || "")) {
      const compatiblePayload = {
        profile_image_url: payload.profile_image_url,
        status_lookup_enabled: payload.status_lookup_enabled,
        updated_at: payload.updated_at,
      };
      ({ error } = await client.from("site_settings").update(compatiblePayload).eq("id", 1));
      profileAdjustmentsLocalOnly = !error;
    }
    if (error && /profile_image_url|schema cache|column/i.test(error.message || "")) {
      const basePayload = {
        status_lookup_enabled: payload.status_lookup_enabled,
        updated_at: payload.updated_at,
      };
      ({ error } = await client.from("site_settings").update(basePayload).eq("id", 1));
      profileAdjustmentsLocalOnly = !error;
    }
    if (error) {
      console.error("Settings save failed:", error);
      const localPayload = { ...payload, profile_local_override: true };
      try { localStorage.setItem("nine-profile-settings", JSON.stringify(localPayload)); } catch (storageError) {}
      window.NineSupabase?.applyProfileSettings?.(localPayload);
      return toast("현재 브라우저에 저장했습니다. 다른 PC와 동기화하려면 Supabase 스키마 적용이 필요합니다.");
    }
    try { localStorage.setItem("nine-profile-settings", JSON.stringify({ ...payload, profile_local_override: false })); } catch (storageError) {}
    window.NineSupabase?.applyProfileSettings?.(payload);
    await log("홈페이지 설정 변경", "프로필 및 상태 조회 설정");
    toast(profileAdjustmentsLocalOnly ? "기본 설정은 저장했습니다. 프로필 조절값은 현재 브라우저에 적용됩니다." : "설정을 저장했습니다.");
  });

  document.querySelector("[data-save-slots]")?.addEventListener("click", async () => {
    const payload = {
      slot_status: document.querySelector("#status")?.value || "접수중",
      total_slots: Number(document.querySelector("#slots")?.value || 0),
      used_slots: Number(document.querySelector("#used")?.value || 0),
      average_period: document.querySelector("#period")?.value || "",
      updated_at: new Date().toISOString(),
    };
    if (payload.used_slots > payload.total_slots) return toast("찬 슬롯 수는 최대 슬롯 수보다 클 수 없습니다.");
    const { error } = await client.from("site_settings").update(payload).eq("id", 1);
    if (error) return toast("슬롯 설정을 저장하지 못했습니다.");
    await log("슬롯 수동 변경", `${payload.used_slots}/${payload.total_slots} · ${payload.slot_status}`);
    toast("슬롯 설정을 저장했습니다.");
  });
  document.querySelector("[data-profile-image]")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    const preview = document.querySelector("[data-profile-preview]");
    if (file && preview) {
      preview.style.backgroundImage = `url("${URL.createObjectURL(file)}")`;
      updateProfilePreview();
    }
  });
  document.querySelectorAll("[data-profile-scale], [data-profile-x], [data-profile-y]").forEach((input) => input.addEventListener("input", updateProfilePreview));

  if (page === "requests") loadRequests();
  if (page === "notices") loadNotices();
  if (page === "gallery") loadGallery();
  if (page === "settings" || page === "slots") loadSettings();
  if (page === "logs") loadLogs();
  if (page === "chats") loadChats();
  if (page === "inquiries") loadInquiries();
})();
