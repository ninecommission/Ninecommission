(function () {
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

  function bindApplyForm() {
    const form = document.querySelector("[data-supabase-form='commission']");
    if (!form) {
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = getFormData(form);

      setStatus(form, "신청을 저장하는 중입니다.", "loading");

      const { error } = await insert("commission_requests", {
        name: values.name || "",
        email: values.email || "",
        contact: values.contact || "",
        request_type: values.type || "",
        people: values.people || "",
        usage: values.usage || "",
        message: values.message || "",
        status: "received",
      });

      if (error) {
        setStatus(form, "Supabase 설정을 확인해주세요. 신청이 저장되지 않았습니다.", "error");
        return;
      }

      form.reset();
      setStatus(form, "신청이 저장되었습니다.", "success");
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
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindApplyForm();
    bindInquiryForm();
  });
})();
