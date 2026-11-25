/* ============================================================
   Salt & Spray — app.js
   Vanilla JS, no dependencies.
   Sections: setup, overlays + focus, navigation, hash routing,
   phone mask, estimate form, before/after rails.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Setup ---------- */

  const shell = document.getElementById("main");
  const topbar = document.querySelector(".topbar");
  const siteFrame = document.querySelector(".site-frame");
  const navLinks = Array.from(document.querySelectorAll(".nav a"));
  const form = document.getElementById("leadForm");
  const phoneInput = document.getElementById("phone");
  const pageSectionIds = ["home", "services", "book"];
  const MOBILE_UA = /Android|iPhone|iPad|iPod/i;
  const OVERLAY_FADE_MS = 260;
  /* Matches the CSS breakpoint where the page switches from the snap-scrolling shell to normal document scroll. */
  const documentScrollQuery = window.matchMedia("(max-width: 1180px)");
  let lastOpener = null;

  const isDocumentScroll = () => documentScrollQuery.matches;
  const visiblePanels = () => Array.from(document.querySelectorAll(".snap-shell > .panel:not([hidden])"));

  /* Hide broken decorative images instead of showing broken icons. */
  document.querySelectorAll("[data-hide-on-error]").forEach((image) => {
    image.addEventListener("error", () => { image.style.display = "none"; }, { once: true });
  });

  /* ---------- Overlays: background lock + focus management ---------- */

  const overlays = [
    { id: "about", el: document.getElementById("about"), openAttr: "data-open-about", closeAttr: "data-close-about", timer: 0 },
    { id: "portfolio", el: document.getElementById("portfolio"), openAttr: "data-open-portfolio", closeAttr: "data-close-portfolio", timer: 0 }
  ].filter((overlay) => overlay.el);

  const openOverlayEl = () => overlays.find((overlay) => !overlay.el.hidden);

  function syncBackgroundInert() {
    if (!siteFrame) return;
    if (openOverlayEl()) siteFrame.setAttribute("inert", "");
    else siteFrame.removeAttribute("inert");
  }

  function trapTab(event, container) {
    const focusables = Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.getClientRects().length > 0);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function returnFocus() {
    if (lastOpener && document.contains(lastOpener) && lastOpener.getClientRects().length > 0) {
      lastOpener.focus({ preventScroll: true });
    }
    lastOpener = null;
  }

  function openOverlay(overlay) {
    /* Cancel a close that is still fading out, so a quick reopen is not hidden by the old timer. */
    window.clearTimeout(overlay.timer);
    if (!overlay.el.hidden && overlay.el.classList.contains("is-open")) return;
    if (document.activeElement && document.activeElement !== document.body) lastOpener = document.activeElement;
    overlay.el.hidden = false;
    syncBackgroundInert();
    document.body.classList.add("portfolio-lock");
    requestAnimationFrame(() => {
      overlay.el.classList.add("is-open");
      overlay.el.setAttribute("aria-hidden", "false");
      const scroller = overlay.el.querySelector(".portfolio-scroll, .about-scroll");
      if (scroller) scroller.scrollTop = 0;
      overlay.el.querySelector(`[${overlay.closeAttr}]`)?.focus({ preventScroll: true });
    });
  }

  function closeOverlay(overlay, targetHash) {
    if (overlay.el.hidden) return;
    overlay.el.classList.remove("is-open");
    overlay.el.setAttribute("aria-hidden", "true");
    document.body.classList.remove("portfolio-lock");
    window.clearTimeout(overlay.timer);
    overlay.timer = window.setTimeout(() => {
      overlay.el.hidden = true;
      syncBackgroundInert();
      if (targetHash) scrollToPanel(panelFromHash(targetHash));
      returnFocus();
    }, OVERLAY_FADE_MS);
  }

  /* ---------- Section navigation ---------- */

  function panelFromHash(hash) {
    if (!hash || hash.length < 2 || hash[0] !== "#") return null;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (err) { return null; }
    const target = document.getElementById(id);
    return target && target.classList.contains("panel") ? target : null;
  }

  function setActiveSection(id) {
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function scrollToPanel(panel) {
    if (!panel) return;
    if (pageSectionIds.includes(panel.id)) setActiveSection(panel.id);
    if (isDocumentScroll()) {
      const offset = topbar ? topbar.offsetHeight : 0;
      const top = panel.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    } else if (shell) {
      shell.scrollTo({ top: panel.offsetTop, behavior: "smooth" });
    }
  }

  /* ---------- Hash routing (deep links) ---------- */

  function openFromHash() {
    const hash = window.location.hash;
    const overlay = overlays.find((item) => hash === `#${item.id}`);
    if (overlay) openOverlay(overlay);
    else scrollToPanel(panelFromHash(hash));
  }

  /* ---------- Click delegation: overlay open/close + in-page panel links ---------- */

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("a[href^='#'], [data-close-about], [data-close-portfolio]");
    if (!trigger) return;
    const href = trigger.getAttribute("href");

    const closing = overlays.find((overlay) => trigger.hasAttribute(overlay.closeAttr));
    if (closing) {
      event.preventDefault();
      closeOverlay(closing, href);
      return;
    }

    const opening = overlays.find((overlay) => trigger.hasAttribute(overlay.openAttr) || href === `#${overlay.id}`);
    if (opening) {
      event.preventDefault();
      openOverlay(opening);
      return;
    }

    const panel = panelFromHash(href);
    if (panel) {
      event.preventDefault();
      scrollToPanel(panel);
    }
  });

  document.addEventListener("keydown", (event) => {
    const overlay = openOverlayEl();
    if (!overlay) return;
    if (event.key === "Tab") trapTab(event, overlay.el);
    if (event.key === "Escape") closeOverlay(overlay);
  });

  /* ---------- Active nav highlighting ---------- */

  if ("IntersectionObserver" in window) {
    let observer;
    const observePanels = () => {
      if (observer) observer.disconnect();
      const documentScroll = isDocumentScroll();
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && pageSectionIds.includes(entry.target.id)) {
            setActiveSection(entry.target.id);
          }
        });
      }, { root: documentScroll ? null : shell, threshold: documentScroll ? 0.28 : 0.58 });
      visiblePanels().forEach((panel) => observer.observe(panel));
    };
    observePanels();
    /* The scroll root only changes when crossing the breakpoint, so rebuild then instead of on every resize event. */
    documentScrollQuery.addEventListener("change", observePanels);
  }

  /* ---------- Phone mask: (949) 593-9085 ---------- */

  if (phoneInput) {
    phoneInput.addEventListener("input", () => {
      const digits = phoneInput.value.replace(/\D/g, "").slice(0, 10);
      if (digits.length > 6) phoneInput.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      else if (digits.length > 3) phoneInput.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      else if (digits.length) phoneInput.value = `(${digits}`;
    });
  }

  /* ---------- Estimate form ---------- */

  function setFormStatus(message, type) {
    const status = document.getElementById("formStatus");
    const panel = form?.closest(".form-panel");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("visible", Boolean(message));
    status.classList.toggle("success", type === "success");
    status.classList.toggle("error", type === "error");
    panel?.classList.toggle("status-success", type === "success");
    panel?.classList.toggle("status-error", type === "error");
  }

  function initForm() {
    if (!form) return;
    const submitButton = form.querySelector(".submit-btn");
    const originalSubmitText = submitButton?.textContent.trim() || "Get Started";

    const resetSubmitButton = () => {
      if (!submitButton) return;
      submitButton.disabled = false;
      submitButton.classList.remove("is-sent");
      submitButton.textContent = originalSubmitText;
    };

    form.querySelectorAll("input, textarea").forEach((input) => {
      input.addEventListener("input", () => {
        input.classList.remove("field-invalid");
        input.closest(".field")?.classList.remove("field-error");
        setFormStatus("", "");
        resetSubmitButton();
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const phoneValue = String(data.get("phone") || "").trim();
      const email = String(data.get("email") || "").trim();
      const projectTypes = data.getAll("projectTypes").map(String);
      const message = String(data.get("message") || "").trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      /* Mark a field (or the checkbox group) as invalid, focus it and show why. */
      const fail = (field, focusTarget, text) => {
        resetSubmitButton();
        field?.classList.add("field-error");
        focusTarget?.focus();
        setFormStatus(text, "error");
      };
      const failInput = (id, text) => {
        const input = document.getElementById(id);
        input?.classList.add("field-invalid");
        fail(input?.closest(".field"), input, text);
      };

      if (!name) return failInput("name", "Enter your name before sending.");
      if (phoneValue.replace(/\D/g, "").length < 10) return failInput("phone", "Enter a valid 10-digit phone number.");
      if (!email || !emailPattern.test(email)) return failInput("email", "Enter a valid email address.");
      if (!projectTypes.length) {
        const group = form.querySelector("[data-project-types-field]");
        return fail(group, group?.querySelector("input"), "Choose at least one project type.");
      }

      const summary = [
        "New Salt & Spray free estimate request", "",
        `Name: ${name}`,
        `Phone: ${phoneValue}`,
        `Email: ${email}`,
        `Project Types: ${projectTypes.join(", ")}`, "",
        "Project Details:", message || "No project details provided.", "",
        "Send follow-up to the client using the phone/email listed above."
      ].join("\n");

      if (submitButton) {
        submitButton.classList.add("is-sent");
        submitButton.textContent = "Text Ready";
      }
      const isMobile = MOBILE_UA.test(navigator.userAgent);
      setFormStatus(isMobile ? "Text ready. Press Send in Messages to submit." : "Text ready. Send your request to (949) 593-9085.", "success");
      const separator = /Android/i.test(navigator.userAgent) ? "?body=" : "&body=";
      window.location.href = `sms:+19495939085${separator}${encodeURIComponent(summary)}`;
    });
  }

  /* ---------- Before/after portfolio rails ---------- */

  function initBeforeAfter() {
    const groups = {
      stains: { label: "Wood Restoration", count: 6, folder: "assets/images/stain-bf", prefix: "stain", ext: "jpeg" },
      painting: { label: "Painting", count: 27, folder: "assets/images/paint-bf", prefix: "paint", ext: "jpeg" }
    };

    const cardTemplate = (group, index) => {
      const item = groups[group];
      const before = `${item.folder}/${item.prefix}${index}-before.${item.ext}`;
      const after = `${item.folder}/${item.prefix}${index}-after.${item.ext}`;
      return `<article class="ba-card"><div class="ba-stage" data-ba-stage>` +
        `<div class="ba-image before"><img src="${before}" alt="${item.label} ${index} before" loading="lazy"><b>Before</b></div>` +
        `<div class="ba-image after"><img src="${after}" alt="${item.label} ${index} after" loading="lazy"><b>After</b></div>` +
        `<span class="ba-label before">Before</span><span class="ba-label after">After</span><span class="ba-divider"></span>` +
        `<input class="ba-range" type="range" min="0" max="100" value="50" aria-label="Move to compare before and after">` +
        `<div class="ba-caption"><span>${String(index).padStart(2, "0")}</span><strong>${item.label} Comparison</strong></div>` +
        `</div></article>`;
    };

    const bindStage = (stage) => {
      const range = stage.querySelector(".ba-range");
      const set = (value) => stage.style.setProperty("--ba-pos", `${value}%`);
      if (range) {
        set(range.value || 50);
        range.addEventListener("input", () => set(range.value));
      }
      stage.querySelectorAll("img").forEach((image) => {
        image.addEventListener("error", () => {
          const wrap = image.closest(".ba-image");
          if (wrap) wrap.classList.add("is-missing");
        }, { once: true });
      });
    };

    document.querySelectorAll("[data-ba-rail]").forEach((rail) => {
      const group = rail.getAttribute("data-ba-rail");
      const item = groups[group];
      if (!item) return;
      rail.innerHTML = Array.from({ length: item.count }, (_, index) => cardTemplate(group, index + 1)).join("");
      rail.querySelectorAll("[data-ba-stage]").forEach(bindStage);
    });

    document.querySelectorAll("[data-ba-scroll]").forEach((button) => {
      button.addEventListener("click", () => {
        const rail = document.querySelector(`[data-ba-rail="${button.getAttribute("data-ba-scroll")}"]`);
        const card = rail?.querySelector(".ba-card");
        if (!rail || !card) return;
        const direction = Number(button.getAttribute("data-ba-dir")) || 1;
        const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
        rail.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
      });
    });
  }

  /* ---------- Boot ---------- */

  initForm();
  initBeforeAfter();
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
})();
