(() => {
  'use strict';

  const HOST_ID = 'hsc-shadow-host';
  if (document.getElementById(HOST_ID)) return;

  const LEVELS = {
    1: { color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.35)' },
    2: { color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  border: 'rgba(251,146,60,0.35)' },
    3: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.35)' },
    4: { color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  border: 'rgba(74,222,128,0.35)' },
    5: { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.35)' },
    6: { color: '#c084fc', bg: 'rgba(192,132,252,0.15)', border: 'rgba(192,132,252,0.35)' },
  };

  const trunc = (s, n) => { const t = s.trim().replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n) + '…' : t; };
  const esc   = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function getHeadings() {
    return [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter(el => !el.closest('#' + HOST_ID));
  }

  function analyze(headings) {
    const issues = [];
    if (!headings.length) {
      return [{ lvl: 'error', msg: 'Geen headings gevonden op deze pagina.' }];
    }

    const h1s = headings.filter(h => h.tagName === 'H1');
    if (!h1s.length) {
      issues.push({ lvl: 'error', msg: 'Geen H1 aanwezig — iedere pagina heeft één H1 nodig (SEO & toegankelijkheid).' });
    } else if (h1s.length > 1) {
      issues.push({ lvl: 'warn', msg: h1s.length + '× H1 gevonden — gebruik bij voorkeur slechts één H1 per pagina.' });
    }

    if (headings[0].tagName !== 'H1') {
      issues.push({ lvl: 'warn', msg: 'Eerste heading is een ' + headings[0].tagName + ' — pagina’s beginnen idealiter met een H1.' });
    }

    const empty = headings.filter(h => !h.textContent.trim());
    if (empty.length) {
      issues.push({ lvl: 'warn', msg: empty.length + ' lege heading' + (empty.length > 1 ? 's' : '') + ' aangetroffen.' });
    }

    for (let i = 1; i < headings.length; i++) {
      const prev = +headings[i - 1].tagName[1];
      const curr = +headings[i].tagName[1];
      if (curr > prev + 1) {
        const skipped = Array.from({ length: curr - prev - 1 }, (_, k) => 'H' + (prev + 1 + k)).join(', ');
        issues.push({
          lvl: 'warn',
          msg: 'Niveausprong ' + headings[i-1].tagName + '→' + headings[i].tagName + ': ' + skipped + ' overgeslagen bij “' + trunc(headings[i].textContent, 40) + '”',
          idx: i,
        });
      }
    }

    return issues;
  }

  function addBadges(headings) {
    headings.forEach(h => {
      if (h.querySelector('.hsc-badge')) return;
      const level = +h.tagName[1];
      const c = LEVELS[level];
      const badge = document.createElement('span');
      badge.className = 'hsc-badge';
      badge.textContent = h.tagName;
      badge.style.cssText = 'color:' + c.color + ';background:' + c.bg + ';border-color:' + c.border;
      h.insertBefore(badge, h.firstChild);
    });
  }

  function removeBadges() {
    document.querySelectorAll('.hsc-badge').forEach(b => b.remove());
  }

  const PANEL_CSS = `
    * { box-sizing: border-box; }

    .panel {
      background: #0f172a;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.6);
      border-bottom: 1px solid #1e293b;
      max-height: 55vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      background: #080f1f;
      border-bottom: 1px solid #1e293b;
      flex-shrink: 0;
      gap: 12px;
    }

    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

    .logo {
      width: 22px; height: 22px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 5px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0;
    }

    .app-name { font-weight: 600; font-size: 13px; color: #f1f5f9; white-space: nowrap; }

    .pill {
      font-size: 11px; padding: 2px 9px; border-radius: 999px;
      font-weight: 500; white-space: nowrap;
    }
    .pill-ok   { background: rgba(34,197,94,0.15); color: #86efac; }
    .pill-warn { background: rgba(250,204,21,0.15); color: #fde047; }
    .pill-err  { background: rgba(239,68,68,0.15);  color: #fca5a5; }

    .counts { display: flex; gap: 5px; flex-wrap: wrap; }
    .chip {
      font-size: 10px; font-weight: 700; padding: 1px 6px;
      border-radius: 3px; border: 1px solid;
    }

    .actions { display: flex; gap: 6px; flex-shrink: 0; }

    .btn {
      all: unset;
      box-sizing: border-box;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.11);
      color: #94a3b8; padding: 4px 11px; border-radius: 5px;
      cursor: pointer; font-size: 12px;
      transition: background 0.12s, color 0.12s;
      white-space: nowrap;
    }
    .btn:hover { background: rgba(255,255,255,0.13); color: #e2e8f0; }
    .btn-on { background: rgba(99,102,241,0.25) !important; border-color: rgba(99,102,241,0.5) !important; color: #a5b4fc !important; }
    .btn-close:hover { background: rgba(239,68,68,0.2) !important; color: #fca5a5 !important; border-color: rgba(239,68,68,0.4) !important; }

    .body { display: flex; overflow: hidden; flex: 1; min-height: 0; }

    .col { padding: 10px 14px; overflow-y: auto; }
    .col-issues  { min-width: 260px; max-width: 380px; border-right: 1px solid #1e293b; flex-shrink: 0; }
    .col-outline { flex: 1; min-width: 0; }
    .col-full    { border-right: none; }

    .col-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; color: #475569; margin-bottom: 8px;
    }
    .col-title span { font-weight: 400; text-transform: none; letter-spacing: 0; color: #334155; }

    .issue {
      display: flex; align-items: flex-start; gap: 7px;
      padding: 6px 9px; border-radius: 6px; margin-bottom: 5px;
      font-size: 12px; line-height: 1.45;
    }
    .issue-err  { background: rgba(239,68,68,0.1); color: #fca5a5; }
    .issue-warn { background: rgba(250,204,21,0.08); color: #fde047; }
    .issue-icon { flex-shrink: 0; font-size: 11px; margin-top: 1px; }

    .outline { display: flex; flex-direction: column; gap: 1px; }

    .row {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 8px; border-radius: 4px; cursor: pointer;
      transition: background 0.1s;
    }
    .row:hover { background: rgba(255,255,255,0.05); }

    .tag {
      font-size: 10px; font-weight: 700;
      padding: 1px 5px; border-radius: 3px;
      min-width: 22px; text-align: center; border: 1px solid;
      flex-shrink: 0;
    }

    .text {
      font-size: 12px; color: #94a3b8;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .text-empty { color: #475569; font-style: italic; }
  `;

  function buildPanelHTML(headings, issues) {
    const errCount  = issues.filter(i => i.lvl === 'error').length;
    const warnCount = issues.filter(i => i.lvl === 'warn').length;
    const pillClass = errCount ? 'pill-err' : warnCount ? 'pill-warn' : 'pill-ok';
    const pillText  = (errCount || warnCount)
      ? [errCount  && (errCount  + ' fout' + (errCount  > 1 ? 'en' : '')),
         warnCount && (warnCount + ' waarschuwing' + (warnCount > 1 ? 'en' : ''))]
          .filter(Boolean).join(' · ')
      : '✓ Geen problemen';

    const counts = [1,2,3,4,5,6].map(n => {
      const cnt = headings.filter(h => h.tagName === 'H' + n).length;
      if (!cnt && n > 3) return '';
      const c = LEVELS[n];
      return '<span class="chip" style="color:' + c.color + ';background:' + c.bg + ';border-color:' + c.border + '">H' + n + ':' + cnt + '</span>';
    }).join('');

    const issuesHTML = issues.map(issue =>
      '<div class="issue issue-' + (issue.lvl === 'error' ? 'err' : 'warn') + '">'
      + '<span class="issue-icon">' + (issue.lvl === 'error' ? '✖' : '⚠') + '</span>'
      + '<span>' + esc(issue.msg) + '</span>'
      + '</div>'
    ).join('');

    const outlineHTML = headings.map((h, i) => {
      const level = +h.tagName[1];
      const c = LEVELS[level];
      const text = h.textContent.trim().replace(/\s+/g, ' ');
      const indent = (level - 1) * 14;
      return '<div class="row" data-idx="' + i + '" style="margin-left:' + indent + 'px">'
        + '<span class="tag" style="color:' + c.color + ';background:' + c.bg + ';border-color:' + c.border + '">' + h.tagName + '</span>'
        + '<span class="text' + (text ? '' : ' text-empty') + '">' + (text ? esc(trunc(text, 70)) : '(leeg)') + '</span>'
        + '</div>';
    }).join('');

    return '<div class="panel">'
      + '<div class="header">'
        + '<div class="title-row">'
          + '<span class="logo">H</span>'
          + '<span class="app-name">Structuur Checker</span>'
          + '<span class="pill ' + pillClass + '">' + pillText + '</span>'
          + '<div class="counts">' + counts + '</div>'
        + '</div>'
        + '<div class="actions">'
          + '<button class="btn btn-on" id="btn-labels">Labels</button>'
          + '<button class="btn" id="btn-collapse">▲ Inklappen</button>'
          + '<button class="btn btn-close" id="btn-close">✕</button>'
        + '</div>'
      + '</div>'
      + '<div class="body" id="body">'
        + (issues.length
          ? '<div class="col col-issues"><div class="col-title">Problemen</div>' + issuesHTML + '</div>'
          : '')
        + '<div class="col col-outline' + (issues.length === 0 ? ' col-full' : '') + '">'
          + '<div class="col-title">Paginastructuur <span>' + headings.length + ' headings</span></div>'
          + '<div class="outline" id="outline">' + outlineHTML + '</div>'
        + '</div>'
      + '</div>'
    + '</div>';
  }

  function init() {
    const headings = getHeadings();
    const issues   = analyze(headings);

    addBadges(headings);

    const host = document.createElement('div');
    host.id = HOST_ID;
    Object.assign(host.style, {
      position: 'fixed', top: '0', left: '0', right: '0',
      zIndex: '2147483647', display: 'block',
    });

    const shadow = host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = PANEL_CSS;
    shadow.appendChild(styleEl);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildPanelHTML(headings, issues);
    shadow.appendChild(wrapper);

    (document.body || document.documentElement).prepend(host);

    shadow.getElementById('btn-close').addEventListener('click', () => {
      host.remove();
      removeBadges();
    });

    let collapsed = false;
    const bodyEl     = shadow.getElementById('body');
    const collapseBtn = shadow.getElementById('btn-collapse');
    collapseBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      bodyEl.style.display = collapsed ? 'none' : '';
      collapseBtn.textContent = collapsed ? '▼ Uitklappen' : '▲ Inklappen';
    });

    let labelsOn = true;
    const labelBtn = shadow.getElementById('btn-labels');
    labelBtn.addEventListener('click', () => {
      labelsOn = !labelsOn;
      document.querySelectorAll('.hsc-badge').forEach(b => { b.style.display = labelsOn ? '' : 'none'; });
      labelBtn.classList.toggle('btn-on', labelsOn);
    });

    shadow.getElementById('outline').addEventListener('click', e => {
      const row = e.target.closest('.row');
      if (!row) return;
      const h = headings[+row.dataset.idx];
      if (!h) return;
      h.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const prev = { outline: h.style.outline, outlineOffset: h.style.outlineOffset };
      h.style.outline = '2px solid #6366f1';
      h.style.outlineOffset = '4px';
      setTimeout(() => {
        h.style.outline = prev.outline;
        h.style.outlineOffset = prev.outlineOffset;
      }, 2000);
    });
  }

  init();
})();
