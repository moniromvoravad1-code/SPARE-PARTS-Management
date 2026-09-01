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
    appName: 'SPARE PARTS MANAGEMENT SYSTEM',
    logo: 'assets/logo.svg',
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
  flowMode: 'month',
  sel: [],
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

  // Only trust a saved store that still has accounts in it. A blank or
  // half-written record would otherwise load over the defaults and leave
  // nobody able to sign in. An empty parts or tools list is a legitimate
  // state — someone may have deleted the last line — so it must never be
  // read as "nothing saved yet" and reseeded over.
  const usable = loaded &&
    Array.isArray(loaded.users) && loaded.users.length &&
    Array.isArray(loaded.parts) && Array.isArray(loaded.tools);

  if (usable) {
    S = migrate({ ...S, ...loaded });
  } else {
    S = seed();
  }

  // Fill in anything an older backup predates
  if (!S.log) S.log = [];
  if (!S.pos) S.pos = [];
  if (!S.cfg) S.cfg = { appName: 'SPARE PARTS MANAGEMENT SYSTEM', logo: 'assets/logo.svg', sheetUrl: '', autoSync: true, poSeq: 1 };
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

// Scope utilities. "All warehouses" means every warehouse THIS account may
// reach, never the whole store — so an account assigned to one site can never
// read stock from another by switching the selector back to All.
const inSite = (o) => (VIEW.site === 'all' ? mySiteIds().includes(o.site) : o.site === VIEW.site);

// Warehouses the signed-in account may work in
function mySites() {
  const ids = mySiteIds();
  return S.sites.filter((s) => ids.includes(s.id));
}

// Get site by ID
const siteName = (c) => {
  const s = S.sites.find((x) => x.id === c);
  return s ? s.name : c;
};
