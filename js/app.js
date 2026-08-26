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

  // Fall back to the first page this role can see
  if (!canSee(VIEW.page)) VIEW.page = ROLES[VIEW.user.role].pages[0];

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
      repaint();
    };
  }

  $$('[data-filter]').forEach((el) => {
    el.onchange = (e) => {
      VIEW[el.dataset.filter] = e.target.value;
      repaint();
    };
  });

  $$('[data-tab]').forEach((el) => {
    el.onclick = () => {
      VIEW.tab = el.dataset.tab;
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
  const ini = (c.appName || 'VG')
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
    
    // Resume previous session if available and enabled
    const rememberMe = localStorage.getItem('voltgrid_rememberMe') === 'true';
    if (S.session && rememberMe) {
      const user = S.users.find((u) => u.u === S.session.u);
      if (user) {
        // Auto-login with remembered session
        logIt('auto_login', `Auto-login from remembered session: ${user.name}`, 'all', {
          user: user.u
        });
        enter(user, true);
        initSessionTracking();
      }
    }
    
    APP_READY = true;
    console.log('✓ VoltGrid Store initialized');
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

