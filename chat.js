(function () {
  const STORAGE_KEY = "nine-commission-chat-v2";
  const OPEN_KEY = "nine-commission-chat-open-v2";
  const RESET_KEY = "nine-commission-chat-reset-20260715";

  const defaultMessages = [];
  const deletedMessageText = "\uAD00\uB9AC\uC790\uC5D0 \uC758\uD574 \uBA54\uC2DC\uC9C0\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.";

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      return false;
    }
    return true;
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      return false;
    }
    return true;
  }

  function resetOldChatData() {
    if (readStorage(RESET_KEY) === "1") {
      return;
    }

    removeStorage("nine-commission-chat");
    removeStorage("nine-commission-chat-open");
    removeStorage(STORAGE_KEY);
    removeStorage(OPEN_KEY);
    writeStorage(RESET_KEY, "1");
  }

  function loadMessages() {
    try {
      const savedMessages = JSON.parse(readStorage(STORAGE_KEY));
      return Array.isArray(savedMessages) ? savedMessages : defaultMessages;
    } catch (error) {
      return defaultMessages;
    }
  }

  function saveMessages(messages) {
    writeStorage(STORAGE_KEY, JSON.stringify(messages));
  }

  function getVisitorCode() {
    const isMobile = window.matchMedia("(max-width: 760px)").matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const prefix = isMobile ? "M" : "P";
    const key = `nine-commission-chat-visitor-${prefix}`;
    const savedCode = readStorage(key);

    if (savedCode && new RegExp(`^${prefix}-[A-Z0-9]{6}$`).test(savedCode)) {
      return savedCode;
    }

    const randomPart = (window.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-6)
      .toUpperCase()
      .padStart(6, "0");
    const code = `${prefix}-${randomPart}`;
    writeStorage(key, code);
    return code;
  }

  function createIcon(path) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  }

  function isHomePage() {
    const fileName = window.location.pathname.split("/").pop();
    return fileName === "" || fileName === "index.html";
  }

  function initChat() {
    resetOldChatData();

    const widget = document.createElement("section");
    widget.className = "chat-widget";
    widget.setAttribute("aria-label", "\uCC44\uD305 \uBB38\uC758");
    widget.innerHTML = `
      <div class="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title">
        <header class="chat-panel-head">
          <div class="chat-avatar" aria-hidden="true"></div>
          <div>
            <h2 id="chat-title">\uCC44\uD305</h2>
            <p>\uD648\uD398\uC774\uC9C0 \uC548\uC5D0\uC11C \uBC14\uB85C \uBB38\uC758\uB97C \uB0A8\uACA8\uBCF4\uC138\uC694.</p>
          </div>
          <button class="chat-close" type="button" aria-label="\uCC44\uD305 \uB2EB\uAE30">
            ${createIcon('<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>')}
          </button>
        </header>
        <div class="chat-body" data-chat-messages></div>
        <form class="chat-form">
          <label class="chat-input-label" for="chat-message">\uBA54\uC2DC\uC9C0 \uC785\uB825</label>
          <textarea id="chat-message" name="message" rows="2" placeholder="\uBB38\uC758 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694"></textarea>
          <button class="chat-send" type="submit" aria-label="\uBA54\uC2DC\uC9C0 \uBCF4\uB0B4\uAE30">
            ${createIcon('<path d="m22 2-7 20-4-9-9-4z"></path><path d="M22 2 11 13"></path>')}
          </button>
        </form>
      </div>
      <button class="chat-fab" type="button" aria-label="\uCC44\uD305 \uC5F4\uAE30" aria-expanded="false">
        <span class="chat-fab-image" aria-hidden="true"></span>
        ${createIcon('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.3 9.4 9.4 0 0 1-3.4-.6L3 21l1.8-4.5A7.7 7.7 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.3 8.5 8.5 0 0 1 9 8.3"></path>')}
      </button>
    `;

    document.body.appendChild(widget);

    const openButton = widget.querySelector(".chat-fab");
    const closeButton = widget.querySelector(".chat-close");
    const form = widget.querySelector(".chat-form");
    const input = widget.querySelector("#chat-message");
    const messageList = widget.querySelector("[data-chat-messages]");
    const visitorCode = getVisitorCode();
    let messages = loadMessages();
    let replyTimer;

    function setOpen(open) {
      widget.classList.toggle("is-open", open);
      openButton.setAttribute("aria-expanded", String(open));
      writeStorage(OPEN_KEY, open ? "1" : "0");

      if (open) {
        setTimeout(() => input.focus(), 0);
      }
    }

    function renderMessages() {
      messageList.innerHTML = "";

      messages.forEach((message) => {
        const bubble = document.createElement("article");
        bubble.className = `chat-message ${message.role}`;
        bubble.classList.toggle("is-deleted", Boolean(message.deleted));

        const text = document.createElement("p");
        text.textContent = message.text;

        bubble.append(text);
        messageList.appendChild(bubble);
      });

      messageList.scrollTop = messageList.scrollHeight;
    }

    async function loadAdminReplies() {
      const client = window.NineSupabase?.getClient?.();
      if (!client) return;

      const { data, error } = await client.rpc("get_chat_replies", { p_visitor_code: visitorCode });
      if (error || !Array.isArray(data)) return;

      const repliesById = new Map(data.map((reply) => [String(reply.id), reply]));
      const syncedMessages = messages.map((message) => {
        if (!message.serverId) return message;

        const reply = repliesById.get(String(message.serverId));
        if (!reply) {
          return {
            ...message,
            role: "artist",
            text: deletedMessageText,
            deleted: true,
          };
        }

        repliesById.delete(String(message.serverId));
        return {
          ...message,
          role: "artist",
          text: reply.message,
          serverId: String(reply.id),
          deleted: false,
        };
      });

      const newReplies = [...repliesById.values()].map((reply) => ({
        role: "artist",
        text: reply.message,
        serverId: String(reply.id),
        deleted: false,
      }));

      messages = [...syncedMessages, ...newReplies];
      saveMessages(messages);
      renderMessages();
    }

    function addMessage(text) {
      messages = [...messages, { role: "user", text }];
      saveMessages(messages);
      renderMessages();

      if (window.NineSupabase && window.NineSupabase.isReady) {
        window.NineSupabase.insert("chat_messages", {
          page_path: window.location.pathname,
          sender: visitorCode,
          message: text,
        }).then(({ error }) => {
          if (error) console.error("Chat message save failed:", error.message);
        });
      }
    }

    openButton.addEventListener("click", () => {
      setOpen(!widget.classList.contains("is-open"));
    });

    closeButton.addEventListener("click", () => {
      setOpen(false);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const text = input.value.trim();
      if (!text) {
        return;
      }

      addMessage(text);
      input.value = "";
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    renderMessages();
    setOpen(false);
    loadAdminReplies();
    replyTimer = window.setInterval(loadAdminReplies, 5000);
    window.addEventListener("pagehide", () => window.clearInterval(replyTimer), { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChat);
  } else {
    initChat();
  }
})();
