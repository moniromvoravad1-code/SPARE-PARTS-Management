/**
 * js/storage.js - IndexedDB and localStorage abstraction layer
 */

let _db = null;

// Open IndexedDB connection
function openDB() {
  return new Promise((res) => {
    if (!window.indexedDB) return res(null);
    try {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(DB_STORE)) {
          d.createObjectStore(DB_STORE);
        }
      };
      r.onsuccess = (e) => res(e.target.result);
      r.onerror = () => res(null);
      setTimeout(() => res(_db), 2500);
    } catch (e) {
      res(null);
    }
  });
}

// Get value from IndexedDB or localStorage
async function dbGet(k) {
  // Try IndexedDB first
  if (_db) {
    try {
      return await new Promise((res, rej) => {
        const t = _db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(k);
        t.onsuccess = () => res(t.result);
        t.onerror = () => rej();
      });
    } catch (e) {
      // Fall through to localStorage
    }
  }
  
  // Fall back to localStorage
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : undefined;
  } catch (e) {
    return undefined;
  }
}

// Set value in IndexedDB and localStorage
async function dbSet(k, v) {
  // Write to IndexedDB if available
  if (_db) {
    try {
      await new Promise((res, rej) => {
        const t = _db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(v, k);
        t.onsuccess = () => res();
        t.onerror = () => rej();
      });
    } catch (e) {
      // Continue to localStorage
    }
  }
  
  // Always write to localStorage as backup
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    console.warn('Storage quota exceeded or unavailable');
  }
}

// Clear all data
async function dbClear() {
  if (_db) {
    try {
      const t = _db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).clear();
      await new Promise((res, rej) => {
        t.onsuccess = () => res();
        t.onerror = () => rej();
      });
    } catch (e) {
      // Continue
    }
  }
  localStorage.clear();
}

// Initialize storage on app load
async function initStorage() {
  _db = await openDB();
}
