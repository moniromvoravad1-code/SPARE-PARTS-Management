/**
 * config.js - Application constants and configuration
 */

// Database
const DB_NAME = 'voltgrid_store';
const DB_STORE = 'kv';
const LS_KEY = 'voltgrid_store_v1';
const PH_KEY = 'voltgrid_store_photos';
const REMEMBER_KEY = 'voltgrid_rememberMe';

// Photo processing
const PH_MAX = 640;        // Max dimension in pixels
const PH_Q = 0.72;         // JPEG quality

/**
 * How much photo data will fit, which depends entirely on where it is going.
 *
 * localStorage is capped near 5 MB per origin and is charged two bytes per
 * character, while photoBytes() counts characters. Taking off the main store
 * and some headroom for the activity log leaves roughly 1.6 MB of characters,
 * about 25 photos at the size the uploader produces. IndexedDB is disk-bound,
 * so its ceiling exists only to keep the Settings meter meaningful.
 *
 * Read these through photoBudget() in storage.js, never directly - the picker
 * and the meter have to agree on which backend is actually live.
 */
const PH_BUDGET_LS = 1.6 * 1024 * 1024;
const PH_BUDGET_IDB = 64 * 1024 * 1024;
const PH_BUDGET = PH_BUDGET_LS;   // conservative default before storage is probed

// Constants
const DAY = 86400000;      // Milliseconds in a day
const ROWCAP = 5;          // Dashboard list row cap before "show all"

// Month abbreviations
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Navigation definition
const NAV = [
  { g: 'Store' },
  { id: 'home', ic: '▦', t: 'Overview' },
  { id: 'parts', ic: '▤', t: 'Spare Parts' },
  { id: 'tools', ic: '⚒', t: 'Tools' },
  { g: 'Compliance' },
  { id: 'cal', ic: '◎', t: 'Calibration' },
  { id: 'war', ic: '▣', t: 'Warranty' },
  { g: 'Supply' },
  { id: 'po', ic: '⇄', t: 'Purchase Orders' },
  { id: 'log', ic: '≡', t: 'Activity Log' },
  { g: 'System' },
  { id: 'admin', ic: '⚙', t: 'Settings' }
];

/**
 * The single account the app ships with, used to sign in the first time.
 *
 * This password is readable by anyone who views the page source, so treat it as
 * a setup key rather than a secret: sign in, change it under your own account,
 * then create the real staff accounts in Settings -> Accounts, where each one
 * gets its own password, warehouses and module permissions.
 */
const DEMO_USERS = [
  { u: 'manager', p: 'Snt1X6ePdYH6', name: 'Store Manager', position: 'Manager', idCard: '0001', role: 'manager', site: 'all' }
];

// Site code remapping for data migration
const SITE_MIGRATION = {
  HQ: 'TMP',
  BVT: 'CHT',
  KSP: 'AMP',
  SHV: 'SVC'
};

// Warranty terms by category (in months)
const WARRANTY_TERMS = {
  Battery: 60,
  PCS: 36,
  HVAC: 24,
  Electrical: 24,
  Fire: 24,
  Comms: 12,
  Mechanical: 12,
  Consumable: 0
};

// Part consumption rates (parts per day, by category)
const CONSUMPTION_RATES = {
  Consumable: 6,
  HVAC: 4,
  Electrical: 3,
  Fire: 2,
  Comms: 2,
  Battery: 2,
  PCS: 1,
  Mechanical: 2
};
