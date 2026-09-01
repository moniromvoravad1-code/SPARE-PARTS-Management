/**
 * js/navigation.js - Navigation, routing, and site selection
 */

/**
 * Navigate to a page
 */
function go(p) {
  VIEW.page = p;
  VIEW.q = '';
  VIEW.cat = 'all';
  VIEW.stock = 'all';
  VIEW.tab = 'all';
  VIEW.sel = [];
  
  $('#rail').classList.remove('on');
  $('#scrim').classList.remove('on');
  
  buildNav();
  render();
  window.scrollTo(0, 0);
}

/**
 * Navigate to log page with optional filter
 */
function goLog(type) {
  if (!canSee('log')) return toast('The activity log is manager-only', 'bad');

  VIEW.page = 'log';
  VIEW.q = '';
  VIEW.cat = 'all';
  VIEW.stock = 'all';
  VIEW.tab = type || 'all';
  VIEW.sel = [];
  
  $('#rail').classList.remove('on');
  $('#scrim').classList.remove('on');
  
  closeModal();
  buildNav();
  render();
  window.scrollTo(0, 0);
}

/**
 * Build and render navigation
 */
function buildNav() {
  const pages = visiblePages();
  const b = {
    parts: lowParts().length,
    tools: overTools().length,
    cal: calDue().length,
    war: warExpiring().length + warExpired().length,
    po: openPOs()
      .filter((o) => o.status === 'draft').length
  };
  
  $('#nav').innerHTML = NAV.map((n, i) => {
    // A group heading belongs to the entries that follow it, up to the next
    // heading. Show it only when this role can actually see one of them,
    // otherwise a restricted account gets a bare label with nothing beneath.
    if (n.g) {
      const mine = [];
      for (let j = i + 1; j < NAV.length && !NAV[j].g; j++) mine.push(NAV[j]);
      return mine.some((x) => pages.includes(x.id)) ? `<div class="nav-lbl">${n.g}</div>` : '';
    }
    if (!pages.includes(n.id)) return '';
    
    const c = b[n.id] || 0;
    const amber = n.id === 'cal' || n.id === 'po' || n.id === 'war';
    
    return `
      <a data-p="${n.id}" class="${VIEW.page === n.id ? 'on' : ''}">
        <span class="ic">${n.ic}</span>${n.t}
        ${c ? `<span class="bdg ${amber ? 'amber' : ''}">${c}</span>` : ''}
      </a>
    `;
  }).join('');
  
  $$('#nav a').forEach((a) => {
    a.onclick = () => go(a.dataset.p);
  });
  
  const n = alertCount();
  $('#alertDot').classList.toggle('hide', !n);
}

/**
 * Get alert count (for badge)
 */
function alertCount() {
  return lowParts().length + overTools().length + calDue().length + warExpiring().length;
}

/**
 * Page title for the top bar, taken from the navigation definition
 */
function pageTitle(id) {
  const n = NAV.find((x) => x.id === id);
  return n ? n.t : '';
}

/**
 * Build site selector
 */
function buildSites() {
  const lock = VIEW.user.site && VIEW.user.site !== 'all';
  
  if (lock && VIEW.site !== VIEW.user.site) VIEW.site = VIEW.user.site;
  if (!lock && VIEW.site !== 'all' && !S.sites.some((s) => s.id === VIEW.site)) VIEW.site = 'all';
  
  const cur = VIEW.site === 'all' ? null : S.sites.find((s) => s.id === VIEW.site);
  const st = siteStats(VIEW.site);
  
  $('#siteBtn').innerHTML = `
    <span class="cd">${cur ? esc(cur.code) : 'ALL'}</span>
    <span class="nm">${cur ? esc(cur.name) : 'All warehouses'}</span>
    ${st.alerts ? '<span class="wd"></span>' : ''}<span class="cv">▾</span>
  `;
  
  const ps = $('#pgSite');
  if (ps) ps.textContent = cur ? cur.name : `All warehouses · ${S.sites.length} locations`;
}

/**
 * Get stats for a site
 */
function siteStats(id) {
  const P = S.parts.filter((p) => id === 'all' || p.site === id);
  const T = S.tools.filter((t) => id === 'all' || t.site === id);
  const low = P.filter((p) => stockState(p) !== 'ok').length;
  const over = T.filter((t) => toolState(t) === 'over').length;
  const cal = T.filter((t) => ['due', 'exp'].includes(calState(t))).length;
  
  return {
    parts: P.length,
    tools: T.length,
    low,
    over,
    cal,
    alerts: low + over + cal
  };
}

/**
 * Show site selection modal
 */
function siteSheet() {
  const lock = VIEW.user.site && VIEW.user.site !== 'all';
  
  const row = (id, code, name, sub) => {
    const st = siteStats(id);
    const on = VIEW.site === id;
    
    return `
      <button class="siterow ${on ? 'on' : ''}" onclick="setSite('${id}')">
        <span class="cd">${esc(code)}</span>
        <span style="min-width:0;flex:1">
          <span class="nm">${esc(name)}</span>
          <span class="mt">${sub || `${st.parts} parts · ${st.tools} tools`}</span>
        </span>
        <span class="tk">
          ${
            st.alerts
              ? `<span class="pill ${st.low || st.over ? 'out' : 'low'}">${st.alerts} alert${st.alerts > 1 ? 's' : ''}</span>`
              : '<span class="pill ok">clear</span>'
          }
          ${on ? '<div style="color:var(--brand);font-weight:700;font-size:12px;margin-top:4px">Selected</div>' : ''}
        </span>
      </button>
    `;
  };
  
  openModal(
    'Warehouse',
    lock ? 'You have access to one location' : 'Choose which location to view',
    `
      <div style="margin:-16px">
        ${lock ? '' : row('all', 'ALL', 'All warehouses', `${S.parts.length} parts · ${S.tools.length} tools across ${S.sites.length} sites`)}
        ${mySites().map((s) => row(s.id, s.code, s.name)).join('')}
      </div>
    `,
    `<button class="btn" onclick="closeModal()">Close</button>`
  );
}

/**
 * Set active site
 */
function setSite(id) {
  if (!siteAllowed(id)) return toast('That warehouse is not assigned to your account', 'bad');

  VIEW.site = id;
  VIEW.sel = [];
  closeModal();
  buildSites();
  buildNav();
  render();
}

// Setup navigation handlers
$('#siteBtn').onclick = siteSheet;
$('#burger').onclick = () => {
  $('#rail').classList.toggle('on');
  $('#scrim').classList.toggle('on');
};
$('#scrim').onclick = () => {
  $('#rail').classList.remove('on');
  $('#scrim').classList.remove('on');
};
$('#alertBtn').onclick = (e) => {
  e.stopPropagation();
  alertsModal();
};

/**
 * Show alerts modal - everything needing attention, grouped by kind
 */
function alertsModal() {
  const low = lowParts();
  const ov = overTools();
  const cd = calDue();
  const wx = warExpiring();

  const sec = (title, arr, fn) =>
    arr.length
      ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
          color:var(--ink3);margin:14px 0 6px">${title} (${arr.length})</div>` + arr.map(fn).join('')
      : '';

  const row = (k, i, t, s, r) => `
    <div class="al" style="padding-left:0;padding-right:0">
      <div class="al-i ${k}">${i}</div>
      <div style="min-width:0">
        <div class="al-t">${esc(t)}</div>
        <div class="al-s">${esc(s)}</div>
      </div>
      <div class="al-r"><span class="pill ${k}">${esc(r)}</span></div>
    </div>
  `;

  const n = low.length + ov.length + cd.length + wx.length;

  const body = n
    ? sec('Stock below minimum', low, (p) =>
        row(stockState(p) === 'out' ? 'out' : 'low', '▤', p.name,
          `${p.sku} · ${siteName(p.site)}`, `${p.qty}/${p.min}`)) +
      sec('Tools past due', ov, (t) =>
        row('out', '⚒', t.name,
          `${t.code} · ${t.holder}`, Math.abs(daysTo(t.dueAt)) + 'd late')) +
      sec('Calibration', cd, (t) =>
        row(calState(t) === 'exp' ? 'out' : 'low', '◎', t.name,
          `${t.code} · due ${fmtD(t.calNext)}`,
          calState(t) === 'exp' ? 'expired' : daysTo(t.calNext) + 'd')) +
      sec('Warranty expiring', wx, (x) =>
        row('low', '▣', x.name,
          `${x.code} · ends ${fmtD(x.until)}`, daysTo(x.until) + 'd'))
    : empty('✓', 'Nothing needs attention',
        'Stock levels, tool returns, certificates and warranties are all current.');

  openModal(
    'Alerts',
    `${n ? n + ' open item' + (n === 1 ? '' : 's') : 'All clear'} · ${VIEW.site === 'all' ? 'all warehouses' : siteName(VIEW.site)}`,
    body,
    `<button class="btn" onclick="closeModal()">Close</button>`
  );
}

/**
 * Setup user menu
 */
$('#meBtn').onclick = (e) => {
  e.stopPropagation();
  
  const u = VIEW.user;
  const info = getSessionInfo();
  
  openMenu(
    e.currentTarget,
    `
      <div class="mh">${esc(u.name)} · ${ROLES[u.role].label}</div>
      ${canSee('log') ? '<button onclick="closeMenu();go(\'log\')">≡ Activity log</button>' : ''}
      <button onclick="closeMenu();showSessionInfo()">📊 Session info</button>
      ${canSee('admin') ? '<button onclick="closeMenu();go(\'admin\')">⚙ Settings</button>' : ''}
      <button onclick="closeMenu();pwModal()">⚿ Change password</button>
      <div class="div"></div>
      <button class="dgr" onclick="signOut()">⏻ Sign out</button>
    `
  );
};
