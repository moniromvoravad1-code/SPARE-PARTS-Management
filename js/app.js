/**
 * js/app.js - Main application orchestrator
 */

// Global app state initialized
let APP_READY = false;

// Page renderers, keyed by page id
const PAGES = {
  home: renderHome,
  parts: renderParts,
  tools: renderTools,
  cal: renderCalibration,
  war: renderWarranty,
  po: renderPO,
  log: renderLog,
  admin: renderAdmin
};

// List renderers, for repainting a page body without a full rebuild
const PAGE_LISTS = {
  parts: partsList,
  tools: toolsList,
  cal: calList,
  war: warList,
  po: poList,
  log: logList
};

/**
 * Main render function - delegates to page-specific renderers
 */
function render() {
  if (!VIEW.user) return;

  // Fall back to the first page this account can open
  if (!canSee(VIEW.page)) VIEW.page = landingPage();

  // Every module revoked: say so plainly instead of rendering a blank shell
  if (!VIEW.page) {
    $('#pgTitle').textContent = 'No access';
    $('#pgSite').textContent = '';
    $('#page').innerHTML = empty('🔒', 'No modules enabled',
      'This account has no modules turned on. A manager can grant access in Settings → Accounts.');
    buildNav();
    $('#alertDot').classList.add('hide');
    return;
  }

  $('#pgTitle').textContent = pageTitle(VIEW.page);
  buildSites();

  const renderFn = PAGES[VIEW.page];
  if (renderFn) {
    renderFn();
  } else {
    $('#page').innerHTML = empty('🔒', 'Access denied', 'You do not have permission to view this page');
  }

  bind();
  $('#alertDot').classList.toggle('hide', !alertCount());
}

/**
 * Wire up the search box, filters, tabs and shortcut links on the current page
 */
function bind() {
  $$('[data-go]').forEach((el) => {
    el.onclick = () => go(el.dataset.go);
  });

  const q = $('#q');
  if (q) {
    q.oninput = (e) => {
      VIEW.q = e.target.value;
      VIEW.sel = [];
      repaint();
    };
  }

  $$('[data-filter]').forEach((el) => {
    el.onchange = (e) => {
      VIEW[el.dataset.filter] = e.target.value;
      VIEW.sel = [];
      repaint();
    };
  });

  $$('[data-tab]').forEach((el) => {
    el.onclick = () => {
      VIEW.tab = el.dataset.tab;
      VIEW.sel = [];
      render();
    };
  });
}

/**
 * Repaint just the list on the current page, keeping the search box focused
 */
function repaint() {
  const host = $('#listHost');
  const listFn = PAGE_LISTS[VIEW.page];

  if (!host || !listFn) {
    render();
    return;
  }

  host.innerHTML = listFn();
}

/**
 * Apply branding
 */
function brand() {
  const c = S.cfg;
  const ini = (c.appName || 'SNT')
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  
  ['lk', 'rl'].forEach((k) => {
    const holder = $(`#${k}Logo`);
    if (c.logo) {
      holder.outerHTML = `<img id="${k}Logo" src="${c.logo}" alt="">`;
    } else {
      holder.outerHTML = `<div id="${k}Logo" class="${k === 'lk' ? 'lk-mark' : 'rail-mark'}">${esc(ini)}</div>`;
    }
  });
  
  $('#lkName').textContent = c.appName;
  $('#rlName').textContent = c.appName;
  document.title = c.appName + ' — Spare Parts & Tools';
}

/**
 * Setup clock on lock screen
 */
function tick() {
  const d = new Date();
  $('#lkTime').textContent = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  $('#lkDate').textContent = d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

setInterval(tick, 1000);

/**
 * Initialize application
 */
async function initApp() {
  try {
    // Initialize storage
    await initStorage();
    
    // Load state or initialize with seed
    await loadState();
    
    // Load device photos before anything can render a thumbnail
    await loadPhotos();

    // Apply branding
    brand();
    tick();

    // Show where the data currently lives
    setSync(
      S.cfg.sheetUrl
        ? '● ' + (S.cfg.lastSync ? 'synced ' + ago(S.cfg.lastSync) : 'connected')
        : '● local only'
    );

    // Setup auth handlers
    initAuth();

    // Read the sheet only once signing in is possible, so a slow or
    // unreachable endpoint can never leave the login screen dead.
    if (S.cfg.autoSync && S.cfg.sheetUrl) {
      setSync('● reading sheet…', '#C2740D');
      pullData()
        .then((n) => {
          console.log(`✓ loaded from Google Sheets: ${n.parts} parts, ${n.tools} tools, ${n.pos} orders`);
          setSync('● synced ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), '#8FE3C8');
          if (VIEW.user) {
            buildSites();
            buildNav();
            render();
          }
        })
        .catch((e) => {
          console.warn('Could not read the sheet, using the copy on this device:', e.message);
          setSync('● local only');
        });
    }

    // Resume the session left behind by the last visit. Refreshing the page
    // should never throw the user back to the lock screen — only an explicit
    // sign-out, which clears S.session, or a session past the ceiling does
    // that. "Remember me" lifts the ceiling so the sign-in also survives
    // closing the browser.
    const rememberMe = localStorage.getItem('voltgrid_rememberMe') === 'true';
    const resumable = S.session &&
      (rememberMe || Date.now() - S.session.at < SESSION_CONFIG.maxSessionDuration);

    if (resumable) {
      const user = S.users.find((u) => u.u === S.session.u && u.active !== 0);
      if (user) {
        logIt('auto_login', `Resumed session: ${user.name}`, 'all', { user: user.u });
        enter(user, rememberMe);
      }
    }
    
    APP_READY = true;
    console.log('✓ SPARE PARTS MANAGEMENT SYSTEM initialized');
  } catch (e) {
    console.error('Initialization error:', e);
    toast('Failed to initialize application', 'bad');
  }
}

// Escape closes whatever is open, menu first
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMenu();
    closeModal();
  }
});

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

