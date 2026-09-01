/**
 * VoltGrid Store — Google Sheets backend
 * Companion to voltgrid-store.html
 *
 * SETUP
 *  1. Create a Google Sheet. Extensions ▸ Apps Script. Paste this file in, replacing everything.
 *  2. Deploy ▸ New deployment ▸ Web app.
 *       Execute as:      Me
 *       Who has access:  Anyone
 *  3. Copy the /exec URL and paste it into the app under Settings ▸ Google Sheets sync.
 *  4. In the app: "Push to Sheets" writes the device data up; "Pull from Sheets" reads it back.
 *
 * Tabs are created automatically: Parts, Tools, PurchaseOrders, Sites, ActivityLog.
 * Edit values directly in the Parts and Tools tabs, then Pull to bring the changes into the app.
 */

/**
 * The spreadsheet this endpoint reads and writes.
 *
 * Taken from the sheet's own URL:
 *   https://docs.google.com/spreadsheets/d/THIS_PART/edit
 *
 * Setting it explicitly means the script works whether you created it from
 * inside the sheet (Extensions ▸ Apps Script) or as a standalone project.
 * Leave it empty to use whichever sheet the script is attached to.
 */
var SHEET_ID = '1thSXAHKVB_1M6ICV27P9Urr0mcIPQLHBZbGdCOEAwEY';

var TABS = {
  Parts: ['id','sku','name','cat','site','qty','min','unit','bin','cost','sup','lt','war','warFrom','photo','updated'],
  Tools: ['id','code','name','cat','site','status','holder','outAt','dueAt','calInt','calLast','calNext','cert','war','warFrom','photo','cond','notes'],
  PurchaseOrders: ['id','no','sup','site','status','created','eta','by','notes','linesJSON'],
  Sites: ['id','name','code'],
  ActivityLog: ['id','ts','type','by','site','part','qty','value','txt']
};

var NUMERIC = ['qty','min','cost','lt','calInt','war','updated','outAt','created','ts','value'];

/* ---------------- entry points ---------------- */

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.action === 'push') {
      writeAll(req.payload || {});
      return json({ ok: true, wrote: Object.keys(req.payload || {}) });
    }
    return json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'pull') return json(readAll());
    return json({ ok: true, message: 'VoltGrid Store endpoint is live. Use ?action=pull' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ---------------- write ---------------- */

function writeAll(p) {
  if (p.parts) writeTab('Parts', p.parts, function (r) { return r; });
  if (p.tools) writeTab('Tools', p.tools, function (r) { return r; });
  if (p.sites) writeTab('Sites', p.sites, function (r) { return r; });
  if (p.log)   writeTab('ActivityLog', p.log, function (r) { return r; });
  if (p.pos)   writeTab('PurchaseOrders', p.pos, function (o) {
    var c = {}; for (var k in o) if (k !== 'lines') c[k] = o[k];
    c.linesJSON = JSON.stringify(o.lines || []);
    return c;
  });
  PropertiesService.getScriptProperties().setProperty('lastPush', new Date().toISOString());
}

function writeTab(name, rows, map) {
  var sh = tab(name), cols = TABS[name];
  sh.clear();
  sh.getRange(1, 1, 1, cols.length).setValues([cols])
    .setFontWeight('bold').setBackground('#0F766E').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  if (!rows.length) return;
  var data = rows.map(function (row) {
    var m = map(row);
    return cols.map(function (c) {
      var v = m[c];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });
  });
  sh.getRange(2, 1, data.length, cols.length).setValues(data);
  sh.autoResizeColumns(1, Math.min(cols.length, 8));
}

/* ---------------- read ---------------- */

function readAll() {
  var out = {
    parts: readTab('Parts'),
    tools: readTab('Tools'),
    sites: readTab('Sites'),
    pos: readTab('PurchaseOrders').map(function (o) {
      try { o.lines = JSON.parse(o.linesJSON || '[]'); } catch (e) { o.lines = []; }
      delete o.linesJSON;
      return o;
    }),
    log: readTab('ActivityLog').sort(function (a, b) { return Number(b.ts) - Number(a.ts); }),
    pulledAt: new Date().toISOString()
  };
  return out;
}

function readTab(name) {
  var sh = tab(name), last = sh.getLastRow();
  if (last < 2) return [];
  var cols = TABS[name];
  var vals = sh.getRange(2, 1, last - 1, cols.length).getValues();
  return vals.filter(function (r) { return String(r[0]).trim() !== ''; }).map(function (r) {
    var o = {};
    cols.forEach(function (c, i) {
      var v = r[i];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (NUMERIC.indexOf(c) > -1) v = (v === '' ? 0 : Number(v));
      if (v === '') v = ['calLast','calNext','dueAt','outAt','warFrom'].indexOf(c) > -1 ? null : '';
      o[c] = v;
    });
    return o;
  });
}

/* ---------------- helpers ---------------- */

function book() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet. Set SHEET_ID at the top of this script.');
  return ss;
}

function tab(name) {
  var ss = book();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Optional: run this once from the editor to build empty tabs with headers
 * before the first push, so you can see the expected column layout.
 */
function setupTabs() {
  Object.keys(TABS).forEach(function (name) { writeTab(name, [], function (r) { return r; }); });
}

/**
 * Optional: pivots movement value by month and site onto its own tab.
 * buildConsumption()          -> "Consumption" tab (stock issued out)
 * buildConsumption('receive') -> "GoodsIn" tab (stock received in)
 * Run a Push from the app first, then run this. Handy for board reporting.
 */
function buildConsumption() {
  var kind = arguments[0] === 'receive' ? 'receive' : 'issue';
  var rows = readTab('ActivityLog').filter(function (r) { return r.type === kind && Number(r.qty); });
  var sites = readTab('Sites').map(function (s) { return s.id; });
  var pivot = {};
  rows.forEach(function (r) {
    var dt = new Date(Number(r.ts));
    var key = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2);
    pivot[key] = pivot[key] || {};
    pivot[key][r.site] = (pivot[key][r.site] || 0) + Number(r.value || 0);
  });
  var sh = tab(kind === 'receive' ? 'GoodsIn' : 'Consumption');
  sh.clear();
  var head = ['Month'].concat(sites, 'Total');
  sh.getRange(1, 1, 1, head.length).setValues([head])
    .setFontWeight('bold').setBackground('#0F766E').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  var keys = Object.keys(pivot).sort();
  if (!keys.length) return;
  var data = keys.map(function (k) {
    var total = 0;
    var cells = sites.map(function (s) { var v = pivot[k][s] || 0; total += v; return v; });
    return [k].concat(cells, total);
  });
  sh.getRange(2, 1, data.length, head.length).setValues(data);
  sh.getRange(2, 2, data.length, head.length - 1).setNumberFormat('$#,##0');
}

/**
 * Optional: set a daily trigger on this to email whoever should chase low stock.
 * Reads the Parts tab, so run a Push from the app first.
 */
function emailLowStock() {
  var TO = 'you@example.com';               // <-- change this
  var parts = readTab('Parts').filter(function (p) { return Number(p.qty) <= Number(p.min); });
  if (!parts.length) return;
  var lines = parts.map(function (p) {
    return '• ' + p.name + ' (' + p.sku + ') — ' + p.qty + ' of min ' + p.min + ' at ' + p.site;
  }).join('\n');
  MailApp.sendEmail(TO, 'VoltGrid Store: ' + parts.length + ' items below minimum',
    'These parts are at or below their minimum level:\n\n' + lines +
    '\n\nOpen the store app to raise a purchase order.');
}
