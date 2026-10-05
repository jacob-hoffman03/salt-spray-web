/* ============================================================
   Salt & Spray — app.js
   Clean rebuild (Oct 2026). Vanilla JS, no dependencies.
   Sections: setup, overlays + focus, navigation, hash routing,
   phone mask, estimate form + photo upload, before/after rails.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Setup ---------- */

  const shell = document.getElementById("main");
  const topbar = document.querySelector(".topbar");
  const siteFrame = document.querySelector(".site-frame");
  const navLinks = Array.from(document.querySelectorAll(".nav a"));
  const portfolio = document.getElementById("portfolio");
  const about = document.getElementById("about");
  const form = document.getElementById("leadForm");
  const phoneInput = document.getElementById("phone");
  const photoFiles = [];
  const pageSectionIds = ["home", "services", "book"];
  const MOBILE_UA = /Android|iPhone|iPad|iPod/i;
  let lastOpener = null;

  const isDocumentScroll = () => window.matchMedia("(max-width: 1180px)").matches;
  const visiblePanels = () => Array.from(document.querySelectorAll(".snap-shell > .panel:not([hidden])"));

  /* Hide broken decorative images instead of showing broken icons. */
  document.querySelectorAll("[data-hide-on-error]").forEach((image) => {
    image.addEventListener("error", () => { image.style.display = "none"; }, { once: true });
  });

  /* ---------- Overlays: background lock + focus management ---------- */

  function syncBackgroundInert() {
    if (!siteFrame) return;
    const anyOpen = (portfolio && !portfolio.hidden) || (about && !about.hidden);
    if (anyOpen) siteFrame.setAttribute("inert", "");
    else siteFrame.removeAttribute("inert");
  }

  function trapTab(event, container) {
    if (event.key !== "Tab" || !container || container.hidden) return;
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

  function openOverlay(overlay, closeAttr) {
    if (!overlay || !overlay.hidden) return;
    if (document.activeElement && document.activeElement !== document.body) lastOpener = document.activeElement;
    overlay.hidden = false;
    syncBackgroundInert();
    document.body.classList.add("portfolio-lock");
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      const scroller = overlay.querySelector(".portfolio-scroll, .about-scroll");
      if (scroller) scroller.scrollTop = 0;
      overlay.querySelector(`[${closeAttr}]`)?.focus({ preventScroll: true });
    });
  }

  function closeOverlay(overlay, closeAttr, targetId) {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("portfolio-lock");
    window.setTimeout(() => {
      overlay.hidden = true;
      syncBackgroundInert();
      if (targetId) scrollToPanel(document.querySelector(targetId));
      returnFocus();
    }, 260);
  }

  const openPortfolio = () => openOverlay(portfolio, "data-close-portfolio");
  const closePortfolio = (targetId) => closeOverlay(portfolio, "data-close-portfolio", targetId);
  const openAbout = () => openOverlay(about, "data-close-about");
  const closeAbout = (targetId) => closeOverlay(about, "data-close-about", targetId);

  /* ---------- Section navigation ---------- */

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
    let hash = "";
    try { hash = window.location.hash; } catch (err) { hash = ""; }
    if (!hash || hash === "#") return;
    if (hash === "#about") { openAbout(); return; }
    if (hash === "#portfolio") { openPortfolio(); return; }
    let target = null;
    try { target = document.querySelector(hash); } catch (err) { target = null; }
    if (target && target.classList.contains("panel")) scrollToPanel(target);
  }

  /* ---------- Anchor click delegation ---------- */

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href) return;
      if (link.hasAttribute("data-open-about") || href === "#about") {
        event.preventDefault();
        openAbout();
        return;
      }
      if (link.hasAttribute("data-open-portfolio") || href === "#portfolio") {
        event.preventDefault();
        openPortfolio();
        return;
      }
      if (link.hasAttribute("data-close-portfolio")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closePortfolio(href.startsWith("#") ? href : null);
        return;
      }
      if (link.hasAttribute("data-close-about")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeAbout(href.startsWith("#") ? href : null);
        return;
      }
      const target = document.querySelector(href);
      if (target && target.classList.contains("panel")) {
        event.preventDefault();
        scrollToPanel(target);
      }
    });
  });

  document.querySelectorAll("[data-close-portfolio]").forEach((button) => {
    if (button.tagName === "A") return; /* anchors handled above */
    button.addEventListener("click", (event) => {
      const href = button.getAttribute("href");
      event.preventDefault();
      closePortfolio(href && href.startsWith("#") ? href : null);
    });
  });

  document.querySelectorAll("[data-close-about]").forEach((button) => {
    if (button.tagName === "A") return; /* anchors handled above */
    button.addEventListener("click", (event) => {
      const href = button.getAttribute("href");
      event.preventDefault();
      closeAbout(href && href.startsWith("#") ? href : null);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      if (portfolio && !portfolio.hidden) trapTab(event, portfolio);
      else if (about && !about.hidden) trapTab(event, about);
    }
    if (event.key === "Escape" && portfolio && !portfolio.hidden) closePortfolio();
    if (event.key === "Escape" && about && !about.hidden) closeAbout();
  });

  /* ---------- Active nav highlighting ---------- */

  if ("IntersectionObserver" in window) {
    let observer;
    const refresh = () => {
      if (observer) observer.disconnect();
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && pageSectionIds.includes(entry.target.id)) {
            setActiveSection(entry.target.id);
          }
        });
      }, { root: isDocumentScroll() ? null : shell, threshold: isDocumentScroll() ? 0.28 : 0.58 });
      visiblePanels().forEach((panel) => observer.observe(panel));
    };
    refresh();
    window.addEventListener("resize", refresh);
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

  function initPhotoUpload() {
    const addBtn = document.getElementById("photoAddBtn");
    const fileInput = document.getElementById("projectPhotos");
    const thumbs = document.getElementById("photoThumbs");
    if (!addBtn || !fileInput || !thumbs) return;
    const MAX_PHOTOS = 6;
    const MAX_SIZE = 5 * 1024 * 1024;

    const isImage = (file) => {
      if (file.type && file.type.startsWith("image/")) return true;
      return /\.(jpe?g|png|heic|heif|webp|gif)$/i.test(file.name || "");
    };

    const renderThumbs = () => {
      thumbs.innerHTML = "";
      photoFiles.forEach((file, index) => {
        const item = document.createElement("li");
        item.className = "photo-thumb";
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = file.name || `Project photo ${index + 1}`;
        img.onload = () => URL.revokeObjectURL(img.src);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "photo-thumb-remove";
        remove.setAttribute("aria-label", `Remove ${file.name || "photo"}`);
        remove.textContent = "×";
        remove.addEventListener("click", () => {
          photoFiles.splice(index, 1);
          renderThumbs();
        });
        item.append(img, remove);
        thumbs.appendChild(item);
      });
    };

    const addFiles = (files) => {
      for (const file of files) {
        if (photoFiles.length >= MAX_PHOTOS) {
          setFormStatus(`You can attach up to ${MAX_PHOTOS} photos.`, "error");
          break;
        }
        if (!isImage(file)) {
          setFormStatus(`"${file.name}" is not an image file.`, "error");
          continue;
        }
        if (file.size > MAX_SIZE) {
          setFormStatus(`"${file.name}" is over 5 MB — pick a smaller photo.`, "error");
          continue;
        }
        photoFiles.push(file);
      }
      fileInput.value = "";
      renderThumbs();
    };

    addBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => addFiles(fileInput.files));
    ["dragenter", "dragover"].forEach((evt) => addBtn.addEventListener(evt, (e) => {
      e.preventDefault();
      addBtn.classList.add("is-dragover");
    }));
    ["dragleave", "drop"].forEach((evt) => addBtn.addEventListener(evt, (e) => {
      e.preventDefault();
      addBtn.classList.remove("is-dragover");
    }));
    addBtn.addEventListener("drop", (e) => {
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
  }

  function photoSummaryLine() {
    if (!photoFiles.length) return null;
    const short = (name) => (name && name.length > 24 ? name.slice(0, 21) + "…" : (name || "photo"));
    const names = photoFiles.slice(0, 3).map((f) => short(f.name));
    const extra = photoFiles.length > 3 ? ` +${photoFiles.length - 3} more` : "";
    return `Photos: ${photoFiles.length} selected (${names.join(", ")}${extra}) — client attaching in Messages`;
  }

  function initForm() {
    if (!form) return;
    const submitButton = form.querySelector(".submit-btn");
    const originalSubmitText = submitButton?.textContent.trim() || "Get Started";

    form.querySelectorAll("input, select, textarea").forEach((input) => {
      input.addEventListener("input", () => {
        input.classList.remove("field-invalid");
        input.closest(".field")?.classList.remove("field-error");
        setFormStatus("", "");
        if (submitButton) submitButton.disabled = false;
        if (submitButton?.classList.contains("is-sent")) {
          submitButton.classList.remove("is-sent");
          submitButton.textContent = originalSubmitText;
        }
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const phoneValue = String(data.get("phone") || "").trim();
      const email = String(data.get("email") || "").trim();
      const projectTypes = Array.from(
        form.querySelectorAll('input[name="projectTypes"]:checked')
      ).map((input) => input.value);
      const message = String(data.get("message") || "").trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const resetButton = () => {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove("is-sent");
          submitButton.textContent = originalSubmitText;
        }
      };
      const fail = (id, text) => {
        const input = document.getElementById(id);
        resetButton();
        input?.classList.add("field-invalid");
        input?.closest(".field")?.classList.add("field-error");
        input?.focus();
        setFormStatus(text, "error");
      };
      const failGroup = (selector, text) => {
        const field = form.querySelector(selector);
        resetButton();
        field?.classList.add("field-error");
        field?.querySelector("input")?.focus();
        setFormStatus(text, "error");
      };

      if (!name) return fail("name", "Enter your name before sending.");
      if (phoneValue.replace(/\D/g, "").length < 10) return fail("phone", "Enter a valid 10-digit phone number.");
      if (!email || !emailPattern.test(email)) return fail("email", "Enter a valid email address.");
      if (!projectTypes.length) return failGroup("[data-project-types-field]", "Choose at least one project type.");

      const photoLine = photoSummaryLine();
      const summary = [
        "New Salt & Spray free estimate request", "",
        `Name: ${name}`,
        `Phone: ${phoneValue}`,
        `Email: ${email}`,
        `Project Types: ${projectTypes.join(", ")}`,
        ...(photoLine ? [photoLine] : []), "",
        "Project Details:", message || "No project details provided.", "",
        "Send follow-up to the client using the phone/email listed above."
      ].join("\n");

      if (submitButton) {
        submitButton.classList.add("is-sent");
        submitButton.textContent = "Text Ready";
      }
      const isMobile = MOBILE_UA.test(navigator.userAgent);
      const photoCount = photoFiles.length;
      const photoPlural = photoCount === 1 ? "photo" : "photos";
      setFormStatus(
        isMobile
          ? (photoCount
            ? `Text ready. Attach your ${photoCount} ${photoPlural} in Messages, then press Send.`
            : "Text ready. Press Send in Messages to submit.")
          : (photoCount
            ? `Text ready. Send your request and ${photoCount} ${photoPlural} to (949) 593-9085.`
            : "Text ready. Send your request to (949) 593-9085."),
        "success");
      const separator = /Android/i.test(navigator.userAgent) ? "?body=" : "&body=";
      window.location.href = `sms:+19495939085${separator}${encodeURIComponent(summary)}`;
    });
  }

  /* ---------- Before/after portfolio rails ---------- */

  function initBeforeAfter() {
    const groups = {
      stains: { label: "Wood Restoration", count: 6, folder: "assets/images/stain-bf", prefix: "stain", ext: "jpeg" },
      painting: { label: "Painting", count: 27, folder: "assets/images/paint-bf", prefix: "paint", ext: "jpeg" },
      faux: { label: "Faux Finish", count: 1, folder: "assets/images/faux-bf", prefix: "faux", ext: "jpeg" }
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
        rail.scrollBy({ left: direction * (card.getBoundingClientRect().width + 22), behavior: "smooth" });
      });
    });
  }

  /* ---------- Boot ---------- */

  initForm();
  initPhotoUpload();
  initBeforeAfter();
  openFromHash();
  window.addEventListener("hashchange", openFromHash);
})();
