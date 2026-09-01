/**
 * js/storage.js - IndexedDB and localStorage abstraction layer
 *
 * The app is shipped as a single file that people open by double-clicking it,
 * so this layer has to survive a `file://` origin: IndexedDB is sometimes
 * blocked or slow there, and Safari throws on `localStorage` outright. The
 * rules that follow from that:
 *
 *   - one backend is chosen before the first read and kept for the session
 *   - a read that misses in IndexedDB still consults localStorage, so data
 *     written in a localStorage-only session is never seeded over
 *   - a write that lands nowhere says so, instead of failing quietly
 */

let _db = null;

/** What is actually live this session. Read by the photo budget and Settings. */
let STORE = { idb: false, ls: false, why: 'init' };

/** Keys whose IndexedDB write failed - do not read a stale copy back. */
const _idbBad = new Set();

/** Set once a save has failed, so the UI can stay honest about it. */
let STORAGE_FAILED = false;

/* ---------- localStorage, guarded ---------- */

// Safari throws from the property getter itself on file://, so every access
// has to sit inside the try - `typeof localStorage` is not a safe pre-check.

function lsGet(k) {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    STORE.ls = false;
    return null;
  }
}

function lsSet(k, v) {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch (e) {
    return false;
  }
}

function lsDel(k) {
  try {
    localStorage.removeItem(k);
    return true;
  } catch (e) {
    return false;
  }
}

function lsProbe() {
  try {
    localStorage.setItem('__vg_probe', '1');
    localStorage.removeItem('__vg_probe');
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- IndexedDB ---------- */

/**
 * Open the database, or give up cleanly.
 *
 * A handle that turns up after the timeout is closed rather than adopted:
 * loadState() runs immediately after initStorage(), so a late handle would mean
 * the read came from localStorage while every later write went to a database
 * the reader never looked at - the same split store this module exists to
 * prevent. One backend, chosen before the first read.
 */
function openDB(timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve({ db: null, why: 'no-indexeddb' });

    let settled = false;
    let timer = null;

    const finish = (db, why) => {
      if (settled) {
        if (db) {
          try { db.close(); } catch (e) { /* nothing to do */ }
        }
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ db, why });
    };

    let r;
    try {
      r = indexedDB.open(DB_NAME, 1);
    } catch (e) {
      return resolve({ db: null, why: 'open-threw' });
    }

    r.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(DB_STORE)) d.createObjectStore(DB_STORE);
    };

    r.onsuccess = (e) => {
      const db = e.target.result;
      db.onversionchange = () => {
        try { db.close(); } catch (x) { /* nothing to do */ }
        _db = null;
        STORE.idb = false;
      };
      db.onclose = () => {
        _db = null;
        STORE.idb = false;
      };
      finish(db, 'ok');
    };

    r.onerror = () => finish(null, 'open-error');

    // Another copy of the app holding an older version open. Rare with a fixed
    // version, but without this handler neither success nor error ever fires.
    r.onblocked = () => finish(null, 'blocked');

    timer = setTimeout(() => finish(null, 'timeout'), timeoutMs);
  });
}

/**
 * A database can open successfully and still be unusable - a half-failed
 * upgrade leaves it without the object store, and every transaction then
 * throws. Find that out once, here, rather than on every read.
 */
function idbProbe(db) {
  return new Promise((res) => {
    try {
      const t = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get('__probe');
      t.onsuccess = () => res(true);
      t.onerror = () => res(false);
    } catch (e) {
      res(false);
    }
  });
}

function idbGet(k) {
  return new Promise((res, rej) => {
    const t = _db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(k);
    t.onsuccess = () => res(t.result);
    t.onerror = () => rej(t.error);
  });
}

function idbPut(k, v) {
  return new Promise((res, rej) => {
    const t = _db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(v, k);
    t.onsuccess = () => res();
    t.onerror = () => rej(t.error);
  });
}

/* ---------- read / write ---------- */

/**
 * Read a value, preferring IndexedDB but never letting an empty one hide a
 * good localStorage copy.
 *
 * @param {string} k
 * @param {function} [looksUsable] - rejects a record that is present but broken,
 *   so a truncated write degrades to a miss instead of triggering a reseed
 */
async function dbGet(k, looksUsable) {
  let idbVal;
  let idbHit = false;
  let idbFaulted = false;

  if (_db && !_idbBad.has(k)) {
    try {
      idbVal = await idbGet(k);
      idbHit = idbVal !== undefined;
    } catch (e) {
      // We no longer know what IndexedDB holds for this key
      idbFaulted = true;
    }
  }

  // dbSet writes IndexedDB first, so where the two disagree localStorage is the
  // stale one. A good hit therefore wins outright.
  if (idbHit && (!looksUsable || looksUsable(idbVal))) return idbVal;

  let lsVal;
  try {
    const raw = localStorage.getItem(k);
    if (raw) lsVal = JSON.parse(raw);
  } catch (e) {
    if (e instanceof SyntaxError) console.warn('Corrupt localStorage record for', k);
    else STORE.ls = false;
  }

  if (lsVal !== undefined && (!looksUsable || looksUsable(lsVal))) {
    // Converge the two stores, but only after a clean miss - then we know for a
    // fact IndexedDB held nothing here, so nothing fresher can be lost. Awaited
    // on purpose: a queued put could otherwise land after migrate() and
    // saveState() and overwrite the migrated store with this older copy.
    if (_db && !idbFaulted && !idbHit) {
      try { await idbPut(k, lsVal); } catch (e) { /* stay on localStorage */ }
    }
    return lsVal;
  }

  // A record we could not validate still beats nothing at all
  if (idbHit) return idbVal;

  return undefined;
}

/**
 * Write a value and report where it actually landed.
 *
 * @returns {Promise<{ok:boolean, idb:boolean, ls:boolean, err:string|null}>}
 *   ok  - durable in at least one backend
 *   err - 'quota' | 'security' | 'idb' | 'none' | null
 */
async function dbSet(k, v, opts) {
  const out = { ok: false, idb: false, ls: false, err: null };
  const mirror = !opts || opts.mirror !== false;

  if (_db) {
    try {
      await idbPut(k, v);
      out.idb = true;
      _idbBad.delete(k);
    } catch (e) {
      out.err = 'idb';
      // Reading this key back from IndexedDB would now return a stale value
      _idbBad.add(k);
      console.warn('IndexedDB write failed for', k, e);
    }
  }

  if (mirror) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      out.ls = true;
    } catch (e) {
      out.err = /security/i.test(e.name) ? 'security' : 'quota';
      if (out.err === 'security') STORE.ls = false;
    }
  }

  // One backend is enough. A full localStorage while IndexedDB is healthy is
  // ordinary, and must not be reported as a failure.
  out.ok = out.idb || out.ls;
  if (!out.ok && !out.err) out.err = 'none';

  return out;
}

/**
 * Tell the user a save did not stick, and keep saying so after the toast goes.
 */
function reportSaveFailure(what, r) {
  STORAGE_FAILED = true;

  const why = r.err === 'quota'
    ? 'Storage on this device is full — remove some photos in Settings.'
    : r.err === 'security'
      ? 'This browser blocks saving for files opened directly. Open it from a web address instead.'
      : 'Storage on this device refused the write.';

  console.error(what, r);
  toast(what + '. ' + why, 'bad');

  if (typeof setSync === 'function') setSync('● not saving', '#FF9A92');
}

/**
 * How much photo data fits, given the backend that is actually live.
 */
function photoBudget() {
  return STORE.idb ? PH_BUDGET_IDB : PH_BUDGET_LS;
}

/**
 * Remove this app's data from the device. Scoped to our own keys: under
 * file:// every local page shares one origin, so localStorage.clear() would
 * take unrelated pages' data with it.
 */
async function dbClear() {
  if (_db) {
    try {
      await new Promise((res, rej) => {
        const t = _db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).clear();
        t.onsuccess = () => res();
        t.onerror = () => rej(t.error);
      });
    } catch (e) {
      // fall through and still clear localStorage
    }
  }

  [LS_KEY, PH_KEY, REMEMBER_KEY].forEach(lsDel);
}

/**
 * Choose the backend for this session, before anything is read.
 */
async function initStorage() {
  const t0 = Date.now();
  const opened = await openDB();
  const usable = opened.db ? await idbProbe(opened.db) : false;

  if (opened.db && !usable) {
    try { opened.db.close(); } catch (e) { /* nothing to do */ }
  }

  _db = usable ? opened.db : null;
  STORE.idb = !!_db;
  STORE.ls = lsProbe();
  STORE.why = usable ? 'ok' : (opened.why === 'ok' ? 'store-missing' : opened.why);

  if (!STORE.idb) {
    console.warn(`IndexedDB unavailable (${STORE.why}) after ${Date.now() - t0}ms — using localStorage`);
  }
  if (!STORE.idb && !STORE.ls) {
    console.error('No storage backend available:', STORE.why);
  }
}
