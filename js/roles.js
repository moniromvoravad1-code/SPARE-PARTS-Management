/**
 * js/roles.js - Modules, role templates and per-account permission resolution
 *
 * Permissions are stored per ACCOUNT, not per role. A role is only a template
 * that seeds a new account and that the manager can reset back to. Everything
 * the app gates on resolves through canDo(), so an account can be tuned without
 * touching anyone else who shares its role.
 */

/**
 * Every module the app exposes, with the actions that make sense for it.
 * The module id doubles as the page id used by NAV, PAGES and the router.
 */
const MODULES = [
  { id: 'home',  t: 'Overview',        acts: ['view', 'financial', 'inventory', 'export'] },
  { id: 'parts', t: 'Spare Parts',     acts: ['view', 'add', 'edit', 'del', 'issue', 'receive', 'transfer', 'adjust', 'export'] },
  { id: 'tools', t: 'Tools',           acts: ['view', 'add', 'edit', 'del', 'checkout', 'return', 'export'] },
  { id: 'cal',   t: 'Calibration',     acts: ['view', 'add', 'edit', 'update', 'export'] },
  { id: 'war',   t: 'Warranty',        acts: ['view', 'add', 'edit', 'update', 'export'] },
  { id: 'po',    t: 'Purchase Orders', acts: ['view', 'add', 'edit', 'approve', 'cancel', 'export'] },
  { id: 'log',   t: 'Activity Log',    acts: ['view', 'export'] },
  { id: 'admin', t: 'Settings',        acts: ['view', 'accounts', 'perms', 'sites', 'branding', 'sync'] }
];

/** Columns of the permission matrix. Anything else shows as an operation toggle. */
const CORE_ACTS = ['view', 'add', 'edit', 'del', 'approve', 'export'];

const ACT_LABEL = {
  view: 'View', add: 'Add', edit: 'Edit', del: 'Delete', approve: 'Approve', export: 'Export',
  issue: 'Issue stock', receive: 'Receive stock', transfer: 'Transfer stock', adjust: 'Adjust stock',
  checkout: 'Check out', return: 'Return', update: 'Update status', cancel: 'Cancel',
  financial: 'Financial figures', inventory: 'Inventory figures',
  accounts: 'Manage accounts', perms: 'Manage permissions', sites: 'Manage sites',
  branding: 'Branding', sync: 'Sheet sync'
};

const moduleById = (id) => MODULES.find((m) => m.id === id);

/** A permission set with every action off. */
function noPerms() {
  const p = {};
  MODULES.forEach((m) => {
    p[m.id] = {};
    m.acts.forEach((a) => (p[m.id][a] = 0));
  });
  return p;
}

/** A permission set with every action on. */
function allPerms() {
  const p = noPerms();
  MODULES.forEach((m) => m.acts.forEach((a) => (p[m.id][a] = 1)));
  return p;
}

/**
 * Build a permission set from a compact { module: [actions] } spec.
 * Unlisted modules and actions stay off.
 */
function grantPerms(spec) {
  const p = noPerms();
  Object.entries(spec).forEach(([mod, acts]) => {
    if (!p[mod]) return;
    acts.forEach((a) => {
      if (p[mod][a] !== undefined) p[mod][a] = 1;
    });
  });
  return p;
}

/**
 * Role templates. `label` is what the UI shows; `perms` seeds a new account and
 * is what "Reset to role default" restores.
 */
const ROLES = {
  manager: {
    label: 'Manager',
    blurb: 'Full system access, accounts, permissions and PO approval',
    perms: allPerms()
  },
  storekeeper: {
    label: 'Storekeeper',
    blurb: 'All stock and tool operations, raises orders',
    perms: grantPerms({
      home: ['view', 'inventory', 'export'],
      parts: ['view', 'add', 'edit', 'issue', 'receive', 'transfer', 'adjust', 'export'],
      tools: ['view', 'add', 'edit', 'checkout', 'return', 'export'],
      po: ['view', 'add', 'edit']
    })
  },
  tech: {
    label: 'Technician',
    blurb: 'Issues parts and books tools out',
    perms: grantPerms({
      home: ['view', 'inventory'],
      parts: ['view', 'issue'],
      tools: ['view', 'checkout', 'return'],
      po: ['view']
    })
  },
  guest: {
    label: 'Guest',
    blurb: 'Read only',
    perms: grantPerms({
      home: ['view'],
      parts: ['view'],
      tools: ['view'],
      cal: ['view'],
      war: ['view']
    })
  }
};

/**
 * The effective permissions for an account: its own saved set where it has one,
 * falling back to its role template for anything not stored. Accounts created
 * before permissions existed therefore keep behaving exactly as before.
 */
function permsFor(user) {
  const tpl = (user && ROLES[user.role] ? ROLES[user.role].perms : null) || noPerms();
  const own = user && user.perms ? user.perms : null;
  const out = noPerms();

  MODULES.forEach((m) => {
    m.acts.forEach((a) => {
      const saved = own && own[m.id] ? own[m.id][a] : undefined;
      out[m.id][a] = (saved === undefined ? tpl[m.id] && tpl[m.id][a] : saved) ? 1 : 0;
    });
  });

  return out;
}

/** Effective permissions for whoever is signed in. */
const myPerms = () => permsFor(VIEW.user);

/**
 * The single gate every feature goes through.
 * An action other than 'view' also requires 'view' on its module, so revoking a
 * module cannot leave a stray action live behind it.
 */
function canDo(mod, act) {
  if (!VIEW.user) return false;

  const p = permsFor(VIEW.user);
  if (!p[mod]) return false;
  if (act !== 'view' && !p[mod].view) return false;

  return !!p[mod][act];
}

/** Can the signed-in account open this page at all? */
const canSee = (page) => canDo(page, 'view');

/** Page ids the signed-in account may open, in menu order. */
const visiblePages = () => MODULES.filter((m) => canDo(m.id, 'view')).map((m) => m.id);

/** Where to land an account that has no page in mind. */
const landingPage = () => visiblePages()[0] || null;

/**
 * Legacy flat capability names, mapped onto the module model. Kept so any call
 * site still using can('x') keeps working; new code should call canDo().
 */
const LEGACY_CAN = {
  edit: ['parts', 'edit'],
  del: ['parts', 'del'],
  issue: ['parts', 'issue'],
  receive: ['parts', 'receive'],
  adjust: ['parts', 'adjust'],
  checkout: ['tools', 'checkout'],
  po: ['po', 'add'],
  poApprove: ['po', 'approve'],
  cal: ['cal', 'update'],
  admin: ['admin', 'view'],
  creds: ['admin', 'accounts'],
  export: ['home', 'export']
};

const can = (k) => {
  const m = LEGACY_CAN[k];
  return m ? canDo(m[0], m[1]) : false;
};

/* ---------- warehouse / site access ---------- */

/**
 * Site ids an account may work in. `sites: []` or a missing list means every
 * site; a single legacy `site` field is honoured as a one-entry list.
 */
function siteIdsFor(user) {
  if (!user) return [];

  const list = Array.isArray(user.sites)
    ? user.sites.filter((id) => id && id !== 'all')
    : (user.site && user.site !== 'all' ? [user.site] : []);

  return list.length ? list : S.sites.map((s) => s.id);
}

/** Site ids the signed-in account may work in. */
const mySiteIds = () => siteIdsFor(VIEW.user);

/** Is this site within the signed-in account's reach? */
const siteAllowed = (id) => id === 'all' || mySiteIds().includes(id);

/** Does this account reach every site the store knows about? */
const hasAllSites = (user) => siteIdsFor(user).length >= S.sites.length;
