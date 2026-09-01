/**
 * js/state.js - Global application state management
 */

// Main application state
let S = {
  v: 3,
  sites: [],
  parts: [],
  tools: [],
  pos: [],
  log: [],
  users: [],
  cfg: {
    appName: 'VoltGrid Store',
    logo: '',
    sheetUrl: '',
    autoSync: true,
    poSeq: 15
  },
  session: null
};

// View state (navigation, filters)
let VIEW = {
  page: 'home',
  site: 'all',
  q: '',
  cat: 'all',
  stock: 'all',
  tab: 'all',
  catMode: 'value',
  user: null
};

// Save state to storage
async function saveState() {
  S.session = VIEW.user ? { u: VIEW.user.u, at: Date.now() } : null;
  await dbSet(LS_KEY, S);
}

// Load state from storage
async function loadState() {
  const loaded = await dbGet(LS_KEY);

  // Only trust a saved store that still has accounts and stock in it. A blank
  // or half-written record would otherwise load over the defaults and leave
  // nobody able to sign in.
  const usable = loaded &&
    Array.isArray(loaded.users) && loaded.users.length &&
    Array.isArray(loaded.parts) && loaded.parts.length;

  if (usable) {
    S = migrate({ ...S, ...loaded });
  } else {
    S = seed();
  }

  // Fill in anything an older backup predates
  if (!S.log) S.log = [];
  if (!S.pos) S.pos = [];
  if (!S.cfg) S.cfg = { appName: 'VoltGrid Store', logo: '', sheetUrl: '', autoSync: true, poSeq: 1 };
}

// Add activity log entry
function logIt(type, txt, site, meta) {
  const e = {
    id: uid('l'),
    ts: Date.now(),
    type,
    by: VIEW.user ? VIEW.user.u : 'system',
    txt,
    site: site || VIEW.site
  };
  if (meta) Object.assign(e, meta);
  S.log.unshift(e);
  // Cap log size
  if (S.log.length > 900) S.log.length = 900;
}

// Scope utilities
const inSite = (o) => VIEW.site === 'all' || o.site === VIEW.site;

// Get current user's accessible sites
function mySites() {
  const lock = VIEW.user.site && VIEW.user.site !== 'all';
  return S.sites.filter((s) => !lock || s.id === VIEW.user.site);
}

// Get site by ID
const siteName = (c) => {
  const s = S.sites.find((x) => x.id === c);
  return s ? s.name : c;
};
