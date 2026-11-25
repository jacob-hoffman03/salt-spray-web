// @ts-check
/* ============================================================
   Salt & Spray — app.js
   Vanilla JS, no build step. Types are JSDoc comments that VS Code
   checks via jsconfig.json; browsers ignore them.

   Layout of this file:
     1. Config         — business details, breakpoints, portfolio sets
     2. DOM helpers    — typed element lookups
     3. Navigation     — panel scrolling + active nav link
     4. Pages          — Back links on the About / Portfolio pages
     5. Routing        — in-page panel links + #hash deep links
     6. Estimate form  — phone mask, validation, SMS hand-off
     7. Portfolio      — before/after comparison rails
     8. Boot
   ============================================================ */
(function () {
  "use strict";

  /* ============================================================
     1. Config
     ============================================================ */

  /** @typedef {{ label: string, count: number, folder: string, prefix: string, ext: string }} BeforeAfterSet */

  const CONFIG = Object.freeze({
    phone: { e164: "+19495939085", display: "(949) 593-9085" },
    /** Must match the CSS breakpoint where the snap-scrolling shell becomes normal page scroll. */
    documentScrollQuery: "(max-width: 1180px)",
    /** Old in-page links that now have their own page (the inline script in index.html handles first load). */
    legacyHashPages: /** @type {Record<string, string>} */ ({ "#about": "about.html", "#portfolio": "portfolio.html" }),
    /** Panels that have a link in the top nav. */
    navSections: ["home", "services", "book"],
    /** How much of a panel must be visible before its nav link lights up. */
    navThreshold: { documentScroll: 0.28, snapShell: 0.58 },
    mobileUserAgent: /Android|iPhone|iPad|iPod/i,
    /** Before/after photo sets, keyed by the rail's data-ba-rail value. Files: {folder}/{prefix}{n}-before|after.{ext} */
    beforeAfterSets: /** @type {Record<string, BeforeAfterSet>} */ ({
      stains: { label: "Wood Restoration", count: 6, folder: "assets/images/stain-bf", prefix: "stain", ext: "jpeg" },
      painting: { label: "Painting", count: 27, folder: "assets/images/paint-bf", prefix: "paint", ext: "jpeg" }
    })
  });

  /* ============================================================
     2. DOM helpers
     ============================================================ */

  /**
   * First element matching `selector` that is an instance of `type`, or null.
   * @template {Element} T
   * @param {string} selector
   * @param {{ new (): T, prototype: T }} type
   * @param {ParentNode} [root]
   * @returns {T | null}
   */
  function query(selector, type, root = document) {
    const el = root.querySelector(selector);
    return el instanceof type ? el : null;
  }

  /**
   * All elements matching `selector` that are instances of `type`.
   * @template {Element} T
   * @param {string} selector
   * @param {{ new (): T, prototype: T }} type
   * @param {ParentNode} [root]
   * @returns {T[]}
   */
  function queryAll(selector, type, root = document) {
    /** @type {T[]} */
    const matches = [];
    root.querySelectorAll(selector).forEach((el) => { if (el instanceof type) matches.push(el); });
    return matches;
  }

  /** Hide broken decorative images instead of showing broken-image icons. */
  function hideBrokenImages() {
    queryAll("img[data-hide-on-error]", HTMLImageElement).forEach((image) => {
      image.addEventListener("error", () => { image.style.display = "none"; }, { once: true });
    });
  }

  /* ============================================================
     3. Navigation
     ============================================================ */

  const documentScrollMedia = window.matchMedia(CONFIG.documentScrollQuery);
  const isDocumentScroll = () => documentScrollMedia.matches;
  /** The home page's snap-scrolling container (desktop only; absent on other pages). */
  const shell = query(".snap-shell", HTMLElement);
  const topbar = query(".topbar", HTMLElement);
  const navLinks = queryAll(".nav a", HTMLAnchorElement);

  /**
   * The page panel a "#id" hash points at, or null for anything else.
   * @param {string | null} hash
   * @returns {HTMLElement | null}
   */
  function panelFromHash(hash) {
    if (!hash || hash.length < 2 || hash[0] !== "#") return null;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (err) { return null; }
    const target = document.getElementById(id);
    return target instanceof HTMLElement && target.classList.contains("panel") ? target : null;
  }

  /** @param {string} id */
  function setActiveSection(id) {
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  /**
   * @param {HTMLElement | null} panel
   * @param {ScrollBehavior} [behavior] "smooth" for clicks on this page, "instant" when arriving from another page.
   */
  function scrollToPanel(panel, behavior = "smooth") {
    if (!panel) return;
    if (CONFIG.navSections.includes(panel.id)) setActiveSection(panel.id);
    if (isDocumentScroll()) {
      const offset = topbar ? topbar.offsetHeight : 0;
      const top = panel.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior });
    } else if (shell) {
      shell.scrollTo({ top: panel.offsetTop, behavior });
    }
  }

  /**
   * On desktop the home page scrolls inside the snap shell, which browsers don't restore
   * on Back. Remember its position when leaving and put it back when returning via Back.
   */
  function initShellScrollRestore() {
    if (!shell) return;
    const key = "salt-spray:shell-scroll";
    window.addEventListener("pagehide", () => {
      try { sessionStorage.setItem(key, String(shell.scrollTop)); } catch (err) { /* storage unavailable */ }
    });
    const nav = performance.getEntriesByType("navigation")[0];
    const isBackForward = nav instanceof PerformanceNavigationTiming && nav.type === "back_forward";
    if (!isBackForward || window.location.hash || isDocumentScroll()) return;
    let saved = null;
    try { saved = sessionStorage.getItem(key); } catch (err) { /* storage unavailable */ }
    if (!saved) return;
    const top = Number(saved);
    /* Apply after the first layout (earlier writes get reset by scroll snapping), and again once loaded. */
    const restore = () => { if (Math.abs(shell.scrollTop - top) > 1) shell.scrollTo({ top, behavior: "instant" }); };
    requestAnimationFrame(restore);
    window.addEventListener("load", restore, { once: true });
  }

  /** Light up the nav link for whichever panel is mostly on screen. */
  function initActiveNavHighlight() {
    if (!("IntersectionObserver" in window)) return;
    const panels = queryAll(".snap-shell > .panel:not([hidden])", HTMLElement);
    /** @type {IntersectionObserver | undefined} */
    let observer;
    const observePanels = () => {
      observer?.disconnect();
      const documentScroll = isDocumentScroll();
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && CONFIG.navSections.includes(entry.target.id)) setActiveSection(entry.target.id);
        });
      }, {
        root: documentScroll ? null : shell,
        threshold: documentScroll ? CONFIG.navThreshold.documentScroll : CONFIG.navThreshold.snapShell
      });
      panels.forEach((panel) => observer?.observe(panel));
    };
    observePanels();
    /* The scroll root only changes when crossing the breakpoint, so rebuild then instead of on every resize. */
    documentScrollMedia.addEventListener("change", observePanels);
  }

  /* ============================================================
     4. Pages: About / Portfolio Back links
     ============================================================ */

  /** True when the visitor reached this page by clicking through from the home page. */
  function cameFromHomePage() {
    if (!document.referrer || window.history.length < 2) return false;
    try {
      const from = new URL(document.referrer);
      return from.origin === window.location.origin && /\/(index\.html)?$/.test(from.pathname);
    } catch (err) {
      return false;
    }
  }

  /**
   * "Back" on the About/Portfolio pages returns to the home page. When the visitor
   * came from there, step back in history instead, so the browser restores the
   * exact scroll position (and usually the cached page) for a seamless return.
   */
  function initBackLinks() {
    queryAll("a[data-page-back]", HTMLAnchorElement).forEach((link) => {
      link.addEventListener("click", (event) => {
        if (!cameFromHomePage()) return;
        event.preventDefault();
        window.history.back();
      });
    });
  }

  /* ============================================================
     5. Routing: in-page panel links + #hash deep links
     ============================================================ */

  /** One delegated handler for every "#panel" link on the home page. */
  function initPanelLinks() {
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href^='#']");
      const panel = panelFromHash(link ? link.getAttribute("href") : null);
      if (!panel) return;
      event.preventDefault();
      scrollToPanel(panel);
    });
  }

  /**
   * Support links like saltandspray.com/#book, and forward the old #about / #portfolio links.
   * @param {ScrollBehavior} [behavior]
   */
  function openFromHash(behavior = "smooth") {
    const hash = window.location.hash;
    const page = CONFIG.legacyHashPages[hash];
    if (page) window.location.replace(page);
    else scrollToPanel(panelFromHash(hash), behavior);
  }

  /**
   * Arriving with a #section link (e.g. "Free Estimate" from the About page): jump straight there.
   * Fonts and images can still shift the layout while loading, so settle on the section again once
   * the page has loaded, unless the visitor has already started scrolling.
   */
  function initLandingOnHash() {
    if (!window.location.hash) return;
    openFromHash("instant");
    const scroller = isDocumentScroll() || !shell ? null : shell;
    const position = () => (scroller ? scroller.scrollTop : window.scrollY);
    const landedAt = position();
    window.addEventListener("load", () => {
      if (Math.abs(position() - landedAt) <= 2) openFromHash("instant");
    }, { once: true });
  }

  /* ============================================================
     6. Estimate form
     ============================================================ */

  /** @typedef {"success" | "error" | ""} FormStatusType */

  /** Format digits as (949) 593-9085 while typing. */
  function initPhoneMask() {
    const phoneInput = query("#phone", HTMLInputElement);
    if (!phoneInput) return;
    phoneInput.addEventListener("input", () => {
      const digits = phoneInput.value.replace(/\D/g, "").slice(0, 10);
      if (digits.length > 6) phoneInput.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      else if (digits.length > 3) phoneInput.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      else if (digits.length) phoneInput.value = `(${digits}`;
    });
  }

  /**
   * @typedef {object} EstimateRequest
   * @property {string} name
   * @property {string} phone
   * @property {string} email
   * @property {string[]} projectTypes
   * @property {string} message
   */

  /**
   * @param {HTMLFormElement} form
   * @returns {EstimateRequest}
   */
  function readEstimateForm(form) {
    const data = new FormData(form);
    /** @param {string} key */
    const text = (key) => String(data.get(key) ?? "").trim();
    return {
      name: text("name"),
      phone: text("phone"),
      email: text("email"),
      projectTypes: data.getAll("projectTypes").map(String),
      message: text("message")
    };
  }

  /**
   * First problem with the request, or null if it can be sent.
   * @param {EstimateRequest} request
   * @returns {{ field: "name" | "phone" | "email" | "projectTypes", message: string } | null}
   */
  function validateEstimate(request) {
    if (!request.name) return { field: "name", message: "Enter your name before sending." };
    if (request.phone.replace(/\D/g, "").length < 10) return { field: "phone", message: "Enter a valid 10-digit phone number." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) return { field: "email", message: "Enter a valid email address." };
    if (!request.projectTypes.length) return { field: "projectTypes", message: "Choose at least one project type." };
    return null;
  }

  /**
   * The text message body the business receives.
   * @param {EstimateRequest} request
   */
  function estimateSmsBody(request) {
    return [
      "New Salt & Spray free estimate request", "",
      `Name: ${request.name}`,
      `Phone: ${request.phone}`,
      `Email: ${request.email}`,
      `Project Types: ${request.projectTypes.join(", ")}`, "",
      "Project Details:", request.message || "No project details provided.", "",
      "Send follow-up to the client using the phone/email listed above."
    ].join("\n");
  }

  /** @param {string} body */
  function smsHref(body) {
    /* Android expects "?body=", iOS/macOS expect "&body=". */
    const separator = /Android/i.test(navigator.userAgent) ? "?body=" : "&body=";
    return `sms:${CONFIG.phone.e164}${separator}${encodeURIComponent(body)}`;
  }

  function initEstimateForm() {
    const form = query("#leadForm", HTMLFormElement);
    if (!form) return;
    const status = query("#formStatus", HTMLElement);
    const panel = form.closest(".form-panel");
    const submitButton = query(".submit-btn", HTMLButtonElement, form);
    const originalSubmitText = submitButton?.textContent?.trim() || "Get Started";

    /**
     * @param {string} message
     * @param {FormStatusType} type
     */
    const setStatus = (message, type) => {
      if (!status) return;
      status.textContent = message;
      status.classList.toggle("visible", Boolean(message));
      status.classList.toggle("success", type === "success");
      status.classList.toggle("error", type === "error");
      panel?.classList.toggle("status-success", type === "success");
      panel?.classList.toggle("status-error", type === "error");
    };

    const resetSubmitButton = () => {
      if (!submitButton) return;
      submitButton.disabled = false;
      submitButton.classList.remove("is-sent");
      submitButton.textContent = originalSubmitText;
    };

    /**
     * Mark a field (or the checkbox group) as invalid, focus it and say why.
     * @param {NonNullable<ReturnType<typeof validateEstimate>>} problem
     */
    const showProblem = (problem) => {
      resetSubmitButton();
      if (problem.field === "projectTypes") {
        const group = query("[data-project-types-field]", HTMLElement, form);
        group?.classList.add("field-error");
        query("input", HTMLInputElement, group ?? form)?.focus();
      } else {
        const input = query(`#${problem.field}`, HTMLInputElement, form);
        input?.classList.add("field-invalid");
        input?.closest(".field")?.classList.add("field-error");
        input?.focus();
      }
      setStatus(problem.message, "error");
    };

    /* Editing any field clears the previous error/success state. */
    queryAll("input, textarea", HTMLElement, form).forEach((input) => {
      input.addEventListener("input", () => {
        input.classList.remove("field-invalid");
        input.closest(".field")?.classList.remove("field-error");
        setStatus("", "");
        resetSubmitButton();
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const request = readEstimateForm(form);
      const problem = validateEstimate(request);
      if (problem) {
        showProblem(problem);
        return;
      }
      if (submitButton) {
        submitButton.classList.add("is-sent");
        submitButton.textContent = "Text Ready";
      }
      const isMobile = CONFIG.mobileUserAgent.test(navigator.userAgent);
      setStatus(isMobile ? "Text ready. Press Send in Messages to submit." : `Text ready. Send your request to ${CONFIG.phone.display}.`, "success");
      window.location.href = smsHref(estimateSmsBody(request));
    });
  }

  /* ============================================================
     7. Portfolio: before/after comparison rails
     ============================================================ */

  /**
   * @param {BeforeAfterSet} set
   * @param {number} index 1-based photo number
   */
  function beforeAfterCard(set, index) {
    const before = `${set.folder}/${set.prefix}${index}-before.${set.ext}`;
    const after = `${set.folder}/${set.prefix}${index}-after.${set.ext}`;
    return `<article class="ba-card"><div class="ba-stage" data-ba-stage>` +
      `<div class="ba-image before"><img src="${before}" alt="${set.label} ${index} before" loading="lazy"><b>Before</b></div>` +
      `<div class="ba-image after"><img src="${after}" alt="${set.label} ${index} after" loading="lazy"><b>After</b></div>` +
      `<span class="ba-label before">Before</span><span class="ba-label after">After</span><span class="ba-divider"></span>` +
      `<input class="ba-range" type="range" min="0" max="100" value="50" aria-label="Move to compare before and after">` +
      `<div class="ba-caption"><span>${String(index).padStart(2, "0")}</span><strong>${set.label} Comparison</strong></div>` +
      `</div></article>`;
  }

  /**
   * Wire the slider to the divider position and flag photos that fail to load.
   * @param {HTMLElement} stage
   */
  function bindBeforeAfterStage(stage) {
    const range = query(".ba-range", HTMLInputElement, stage);
    /** @param {string} value */
    const setPosition = (value) => stage.style.setProperty("--ba-pos", `${value}%`);
    if (range) {
      setPosition(range.value || "50");
      range.addEventListener("input", () => setPosition(range.value));
    }
    queryAll("img", HTMLImageElement, stage).forEach((image) => {
      image.addEventListener("error", () => image.closest(".ba-image")?.classList.add("is-missing"), { once: true });
    });
  }

  function initBeforeAfterRails() {
    queryAll("[data-ba-rail]", HTMLElement).forEach((rail) => {
      const set = CONFIG.beforeAfterSets[rail.dataset.baRail ?? ""];
      if (!set) return;
      rail.innerHTML = Array.from({ length: set.count }, (_, i) => beforeAfterCard(set, i + 1)).join("");
      queryAll("[data-ba-stage]", HTMLElement, rail).forEach(bindBeforeAfterStage);
    });

    /* Prev/next buttons scroll the rail by exactly one card (card width + grid gap). */
    queryAll("[data-ba-scroll]", HTMLButtonElement).forEach((button) => {
      button.addEventListener("click", () => {
        const rail = query(`[data-ba-rail="${button.dataset.baScroll}"]`, HTMLElement);
        const card = rail && query(".ba-card", HTMLElement, rail);
        if (!rail || !card) return;
        const direction = Number(button.dataset.baDir) || 1;
        const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
        rail.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
      });
    });
  }

  /* ============================================================
     8. Boot
     ============================================================ */

  hideBrokenImages();
  initPanelLinks();
  initBackLinks();
  initActiveNavHighlight();
  initPhoneMask();
  initEstimateForm();
  initBeforeAfterRails();
  initShellScrollRestore();
  initLandingOnHash();
  window.addEventListener("hashchange", () => openFromHash());
})();
