(() => {
  "use strict";

  const ID = "hsc";
  const LEVELS = [1, 2, 3, 4, 5, 6];
  const SELECTOR = LEVELS.map(n => `h${n}`).join(",");

  // ── State ──────────────────────────────────────────────────────────────
  let panelVisible = false;
  let activeTab = "issues";
  let headings = [];
  let issues = [];
  let badgesInjected = false;

  // ── Gather headings ────────────────────────────────────────────────────
  function collectHeadings() {
    const nodes = [...document.querySelectorAll(SELECTOR)].filter(el => {
      // skip elements inside our own panel
      return !el.closest(`#${ID}-panel`);
    });

    headings = nodes.map((el, idx) => ({
      el,
      level: parseInt(el.tagName[1], 10),
      text: el.innerText.trim() || "(lege heading)",
      idx,
      isEmpty: !el.innerText.trim(),
    }));
  }

  // ── Analyse issues ─────────────────────────────────────────────────────
  function analyseIssues() {
    issues = [];

    // 1. No headings at all
    if (headings.length === 0) {
      issues.push({
        type: "error",
        icon: "⛔",
        title: "Geen headings gevonden",
        desc: "De pagina bevat geen H1–H6 tags.",
        idx: null,
      });
      return;
    }

    // 2. Missing H1
    const h1s = headings.filter(h => h.level === 1);
    if (h1s.length === 0) {
      issues.push({
        type: "error",
        icon: "⛔",
        title: "Geen H1 aanwezig",
        desc: "Elke pagina hoort precies één H1 te hebben als primaire paginatitel.",
        idx: null,
      });
    }

    // 3. Multiple H1s
    if (h1s.length > 1) {
      issues.push({
        type: "warning",
        icon: "⚠️",
        title: `Meerdere H1's (${h1s.length}×)`,
        desc: "Een pagina heeft idealiter slechts één H1. Meerdere H1's kunnen SEO negatief beïnvloeden.",
        idx: h1s[1].idx,
      });
    }

    // 4. H1 not first heading
    if (h1s.length > 0 && headings[0].level !== 1) {
      issues.push({
        type: "error",
        icon: "⛔",
        title: "H1 staat niet bovenaan",
        desc: `De eerste heading is een H${headings[0].level}. De H1 zou de eerste heading op de pagina moeten zijn.`,
        idx: headings[0].idx,
      });
    }

    // 5. Hierarchy jumps (skipped levels)
    let prevLevel = 0;
    for (const h of headings) {
      if (prevLevel > 0 && h.level > prevLevel + 1) {
        issues.push({
          type: "error",
          icon: "⛔",
          title: `Hiërarchie-sprong: H${prevLevel} → H${h.level}`,
          desc: `"${truncate(h.text, 60)}" — niveau H${h.level} volgt direct op H${prevLevel}. Niveau H${prevLevel + 1} wordt overgeslagen.`,
          idx: h.idx,
        });
      }
      prevLevel = h.level;
    }

    // 6. Empty headings
    for (const h of headings) {
      if (h.isEmpty) {
        issues.push({
          type: "warning",
          icon: "⚠️",
          title: `Lege H${h.level}`,
          desc: "Een heading zonder tekst is zinloos voor zoekmachines en schermlezers.",
          idx: h.idx,
        });
      }
    }

    // 7. Hidden headings (visibility:hidden / display:none)
    for (const h of headings) {
      const style = window.getComputedStyle(h.el);
      if (style.display === "none" || style.visibility === "hidden") {
        issues.push({
          type: "warning",
          icon: "⚠️",
          title: `Verborgen H${h.level}`,
          desc: `"${truncate(h.text, 60)}" is niet zichtbaar (display:none of visibility:hidden).`,
          idx: h.idx,
        });
      }
    }

    // 8. Very long headings (> 120 chars — might indicate misuse)
    for (const h of headings) {
      if (h.text.length > 120) {
        issues.push({
          type: "warning",
          icon: "⚠️",
          title: `Erg lange H${h.level} (${h.text.length} tekens)`,
          desc: `"${truncate(h.text, 80)}" — lange headings zijn moeilijk leesbaar en minder SEO-vriendelijk.`,
          idx: h.idx,
        });
      }
    }

    // 9. Heading inside heading (bad HTML)
    for (const h of headings) {
      const parent = h.el.closest(LEVELS.filter(l => l !== h.level).map(l => `h${l}`).join(","));
      if (parent) {
        issues.push({
          type: "error",
          icon: "⛔",
          title: `H${h.level} genest in een andere heading`,
          desc: "Headings mogen niet in andere headings genest worden; dit is ongeldige HTML.",
          idx: h.idx,
        });
      }
    }

    // 10. Level used nowhere (informational, only check H2 since H1 is already checked)
    const usedLevels = new Set(headings.map(h => h.level));
    // Check for gaps in used levels between min and max
    const minLevel = Math.min(...usedLevels);
    const maxLevel = Math.max(...usedLevels);
    for (let l = minLevel; l <= maxLevel; l++) {
      if (!usedLevels.has(l)) {
        issues.push({
          type: "info",
          icon: "ℹ️",
          title: `H${l} niet gebruikt`,
          desc: `Niveau H${l} wordt nergens gebruikt, terwijl H${l - 1} en H${l + 1} wel aanwezig zijn.`,
          idx: null,
        });
      }
    }
  }

  // ── Badge injection ────────────────────────────────────────────────────
  function injectBadges() {
    removeBadges();
    const errorIdxs = new Set(issues.filter(i => i.idx !== null).map(i => i.idx));

    for (const h of headings) {
      const badge = document.createElement("span");
      badge.className = `${ID}-badge`;
      if (errorIdxs.has(h.idx)) badge.classList.add(`${ID}-badge--error`);
      badge.dataset.level = h.level;
      badge.textContent = `H${h.level}`;
      badge.title = `H${h.level} heading`;

      badge.addEventListener("click", (e) => {
        e.stopPropagation();
        openPanel();
        highlightHeading(h.el);
      });

      h.el.prepend(badge);
    }
    badgesInjected = true;
  }

  function removeBadges() {
    document.querySelectorAll(`.${ID}-badge`).forEach(b => b.remove());
    badgesInjected = false;
  }

  // ── Panel HTML ─────────────────────────────────────────────────────────
  function buildPanel() {
    const panel = document.createElement("div");
    panel.id = `${ID}-panel`;
    panel.innerHTML = panelHTML();
    document.body.appendChild(panel);

    // wire tabs
    panel.querySelectorAll(".hsc-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        activeTab = tab.dataset.tab;
        renderPanelBody();
        panel.querySelectorAll(".hsc-tab").forEach(t => t.classList.toggle("hsc-tab--active", t.dataset.tab === activeTab));
      });
    });

    // close button
    panel.querySelector(`#${ID}-close`).addEventListener("click", closePanel);

    renderPanelBody();
    return panel;
  }

  function panelHTML() {
    const errorCount = issues.filter(i => i.type === "error").length;
    const warnCount  = issues.filter(i => i.type === "warning").length;

    const pills = [
      errorCount ? `<span class="hsc-pill hsc-pill--error">⛔ ${errorCount} fout${errorCount > 1 ? "en" : ""}</span>` : "",
      warnCount  ? `<span class="hsc-pill hsc-pill--warning">⚠️ ${warnCount} waarschuwing${warnCount > 1 ? "en" : ""}</span>` : "",
      !errorCount && !warnCount ? `<span class="hsc-pill hsc-pill--ok">✓ Geen problemen</span>` : "",
    ].join("");

    const issueTabBadge = errorCount + warnCount > 0
      ? `<span class="hsc-tab-badge">${errorCount + warnCount}</span>`
      : "";

    return `
      <div id="${ID}-panel-header">
        <div id="${ID}-panel-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M4 6h16M4 12h16M4 18h10"/>
          </svg>
          H-structuur Checker
        </div>
        <div id="${ID}-panel-summary">${pills}</div>
        <button id="${ID}-close" title="Sluiten">✕</button>
      </div>
      <div id="${ID}-tabs">
        <button class="hsc-tab ${activeTab === "issues" ? "hsc-tab--active" : ""}" data-tab="issues">
          Problemen ${issueTabBadge}
        </button>
        <button class="hsc-tab ${activeTab === "tree" ? "hsc-tab--active" : ""}" data-tab="tree">
          Heading-boom
        </button>
        <button class="hsc-tab ${activeTab === "stats" ? "hsc-tab--active" : ""}" data-tab="stats">
          Statistieken
        </button>
      </div>
      <div id="${ID}-panel-body"></div>
    `;
  }

  function renderPanelBody() {
    const body = document.getElementById(`${ID}-panel-body`);
    if (!body) return;

    if (activeTab === "issues")  body.innerHTML = renderIssuesTab();
    if (activeTab === "tree")    body.innerHTML = renderTreeTab();
    if (activeTab === "stats")   body.innerHTML = renderStatsTab();

    // Attach click-to-scroll on issue items
    body.querySelectorAll(".hsc-issue[data-idx]").forEach(el => {
      el.addEventListener("click", () => {
        const h = headings[parseInt(el.dataset.idx, 10)];
        if (h) highlightHeading(h.el);
      });
    });

    // Attach click-to-scroll on tree items
    body.querySelectorAll(".hsc-tree-item[data-idx]").forEach(el => {
      el.addEventListener("click", () => {
        const h = headings[parseInt(el.dataset.idx, 10)];
        if (h) highlightHeading(h.el);
      });
    });
  }

  function renderIssuesTab() {
    if (issues.length === 0) {
      return `<div class="hsc-empty"><div class="hsc-empty-icon">✅</div>Geen problemen gevonden! De H-structuur ziet er goed uit.</div>`;
    }

    const rows = issues.map(issue => `
      <div class="hsc-issue hsc-issue--${issue.type}" ${issue.idx !== null ? `data-idx="${issue.idx}"` : ""}>
        <div class="hsc-issue-icon">${issue.icon}</div>
        <div class="hsc-issue-text">
          <div class="hsc-issue-title">${escHtml(issue.title)}</div>
          <div class="hsc-issue-desc">${escHtml(issue.desc)}</div>
        </div>
      </div>
    `).join("");

    return `<div class="hsc-issue-list">${rows}</div>`;
  }

  function renderTreeTab() {
    if (headings.length === 0) {
      return `<div class="hsc-empty"><div class="hsc-empty-icon">🔍</div>Geen headings gevonden op deze pagina.</div>`;
    }

    const errorIdxs = new Set(issues.filter(i => i.idx !== null).map(i => i.idx));

    const rows = headings.map(h => {
      const indent = (h.level - 1) * 16;
      const hasError = errorIdxs.has(h.idx);
      return `
        <div class="hsc-tree-item ${hasError ? "hsc-tree-item--error" : ""}" data-idx="${h.idx}" style="padding-left:${6 + indent}px" title="Klik om naar heading te scrollen">
          <span class="hsc-tree-label" data-level="${h.level}">H${h.level}</span>
          <span class="hsc-tree-text">${escHtml(h.text)}</span>
          ${hasError ? `<span class="hsc-tree-error-icon">⚠</span>` : ""}
        </div>
      `;
    }).join("");

    return `<div class="hsc-tree">${rows}</div>`;
  }

  function renderStatsTab() {
    const counts = {};
    LEVELS.forEach(l => { counts[l] = 0; });
    headings.forEach(h => { counts[h.level]++; });

    const cards = LEVELS.map(l => {
      const colors = ["#e53e3e","#dd6b20","#d69e2e","#38a169","#3182ce","#805ad5"];
      return `
        <div class="hsc-info-card">
          <div class="hsc-info-card-num" style="color:${colors[l-1]}">${counts[l]}</div>
          <div class="hsc-info-card-label">H${l} headings</div>
        </div>
      `;
    }).join("");

    const totalIssues = issues.length;
    const errorCount  = issues.filter(i => i.type === "error").length;
    const warnCount   = issues.filter(i => i.type === "warning").length;
    const infoCount   = issues.filter(i => i.type === "info").length;

    return `
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Heading-verdeling</div>
        <div class="hsc-info-grid">${cards}</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:#718096;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Bevindingen</div>
        <div class="hsc-info-grid">
          <div class="hsc-info-card">
            <div class="hsc-info-card-num" style="color:#fc8181">${errorCount}</div>
            <div class="hsc-info-card-label">Fouten</div>
          </div>
          <div class="hsc-info-card">
            <div class="hsc-info-card-num" style="color:#f6ad55">${warnCount}</div>
            <div class="hsc-info-card-label">Waarschuwingen</div>
          </div>
          <div class="hsc-info-card">
            <div class="hsc-info-card-num" style="color:#63b3ed">${infoCount}</div>
            <div class="hsc-info-card-label">Informatie</div>
          </div>
          <div class="hsc-info-card">
            <div class="hsc-info-card-num" style="color:#e2e8f0">${headings.length}</div>
            <div class="hsc-info-card-label">Headings totaal</div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Toggle button ──────────────────────────────────────────────────────
  function buildToggleButton() {
    const btn = document.createElement("button");
    btn.id = `${ID}-toggle`;
    btn.title = "H-structuur Checker";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M4 6h16M4 12h16M4 18h10"/>
      </svg>
      <span id="${ID}-toggle-badge"></span>
    `;
    btn.addEventListener("click", togglePanel);
    document.body.appendChild(btn);
    return btn;
  }

  // ── Panel open / close ─────────────────────────────────────────────────
  function openPanel() {
    panelVisible = true;
    const panel = document.getElementById(`${ID}-panel`);
    if (panel) {
      panel.classList.add(`${ID}-panel--visible`);
      document.body.style.marginTop = panel.offsetHeight + "px";
    }
    const btn = document.getElementById(`${ID}-toggle`);
    if (btn) btn.classList.add(`${ID}-toggle--active`);
  }

  function closePanel() {
    panelVisible = false;
    const panel = document.getElementById(`${ID}-panel`);
    if (panel) {
      panel.classList.remove(`${ID}-panel--visible`);
      document.body.style.marginTop = "";
    }
    const btn = document.getElementById(`${ID}-toggle`);
    if (btn) btn.classList.remove(`${ID}-toggle--active`);
  }

  function togglePanel() {
    if (panelVisible) closePanel();
    else openPanel();
  }

  // ── Highlight / scroll-to ──────────────────────────────────────────────
  function highlightHeading(el) {
    closePanel();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("hsc-highlight");
    void el.offsetWidth; // reflow to restart animation
    el.classList.add("hsc-highlight");
    setTimeout(() => el.classList.remove("hsc-highlight"), 1400);
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + "…" : str;
  }

  function escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Init ───────────────────────────────────────────────────────────────
  function init() {
    // Prevent double injection
    if (document.getElementById(`${ID}-panel`)) return;

    collectHeadings();
    analyseIssues();
    injectBadges();
    buildPanel();
    const btn = buildToggleButton();

    // Show issue count badge on toggle button
    const totalProblems = issues.filter(i => i.type !== "info").length;
    const badge = document.getElementById(`${ID}-toggle-badge`);
    if (badge && totalProblems > 0) {
      badge.textContent = totalProblems;
      badge.classList.add("hsc-visible");
    }

    // Auto-open panel if there are issues
    if (totalProblems > 0) openPanel();
  }

  // ── Message from popup ─────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggle") togglePanel();
    if (msg.action === "refresh") {
      document.getElementById(`${ID}-panel`)?.remove();
      document.getElementById(`${ID}-toggle`)?.remove();
      document.body.style.marginTop = "";
      panelVisible = false;
      badgesInjected = false;
      removeBadges();
      init();
    }
    if (msg.action === "hideBadges") removeBadges();
    if (msg.action === "showBadges") {
      if (!badgesInjected) injectBadges();
    }
  });

  // ── Observe DOM changes (for SPAs) ────────────────────────────────────
  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const panel = document.getElementById(`${ID}-panel`);
      if (!panel) return;
      collectHeadings();
      analyseIssues();
      if (badgesInjected) injectBadges();
      // Rebuild panel header + body to reflect updated issues
      panel.querySelector(`#${ID}-panel-header`).outerHTML; // keep reference
      const newHeader = document.createElement("div");
      newHeader.id = `${ID}-panel-header`;
      newHeader.innerHTML = panelHTML().match(/<div id="hsc-panel-header">([\s\S]*?)<\/div>/)?.[0] ?? "";
      // Easier: rebuild whole panel inner
      panel.innerHTML = panelHTML();
      panel.querySelectorAll(".hsc-tab").forEach(tab => {
        tab.addEventListener("click", () => {
          activeTab = tab.dataset.tab;
          renderPanelBody();
          panel.querySelectorAll(".hsc-tab").forEach(t => t.classList.toggle("hsc-tab--active", t.dataset.tab === activeTab));
        });
      });
      panel.querySelector(`#${ID}-close`).addEventListener("click", closePanel);
      renderPanelBody();

      // update badge
      const totalProblems = issues.filter(i => i.type !== "info").length;
      const badge = document.getElementById(`${ID}-toggle-badge`);
      if (badge) {
        badge.textContent = totalProblems || "";
        badge.classList.toggle("hsc-visible", totalProblems > 0);
      }
    }, 800);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  init();
})();
