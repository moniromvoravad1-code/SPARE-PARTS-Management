/**
 * config.js - Application constants and configuration
 */

// Database
const DB_NAME = 'voltgrid_store';
const DB_STORE = 'kv';
const LS_KEY = 'voltgrid_store_v1';
const PH_KEY = 'voltgrid_store_photos';

// Photo processing
const PH_MAX = 640;        // Max dimension in pixels
const PH_Q = 0.72;         // JPEG quality
const PH_BUDGET = 4.2 * 1024 * 1024;  // 4.2 MB total budget

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
 * Starter accounts, one per role, created the first time the app runs.
 *
 * These are placeholders for evaluating the app — never real staff credentials.
 * Set your team up in Settings → Accounts after signing in as the manager, and
 * change these passwords (or delete these accounts) before anyone relies on them.
 */
const DEMO_USERS = [
  { u: 'manager', p: 'manager123', name: 'Store Manager', position: 'Manager', idCard: '0001', role: 'manager', site: 'all' },
  { u: 'storekeeper', p: 'store123', name: 'Store Keeper', position: 'Storekeeper', idCard: '0002', role: 'storekeeper', site: 'all' },
  { u: 'tech', p: 'tech123', name: 'Site Technician', position: 'Engineer', idCard: '0003', role: 'tech', site: 'all' },
  { u: 'guest', p: 'guest123', name: 'Read Only', position: 'Visitor', idCard: '0004', role: 'guest', site: 'all' }
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
