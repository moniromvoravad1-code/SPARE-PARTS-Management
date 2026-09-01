/**
 * js/ui/components.js - Reusable UI components and helpers
 */

/**
 * Stock status bar - visual indicator of stock level
 */
function sbar(p) {
  const st = stockState(p);
  const span = Math.max(p.min * 2, p.qty, 1);
  const w = Math.min(100, (p.qty / span) * 100);
  const mk = Math.min(100, (p.min / span) * 100);
  
  return `
    <div class="sb ${st === 'ok' ? '' : st}">
      <i style="width:${w}%"></i>
      ${p.min > 0 ? `<u style="left:${mk}%"></u>` : ''}
    </div>
  `;
}

/**
 * Status pills - colored badges for status
 */
const stPill = (st) => ({
  ok: '<span class="pill ok">In stock</span>',
  low: '<span class="pill low">Low</span>',
  out: '<span class="pill out">Out</span>'
}[st]);

const tlPill = (st) => ({
  in: '<span class="pill ok">Available</span>',
  out: '<span class="pill ord">Checked out</span>',
  over: '<span class="pill out">Overdue</span>',
  maint: '<span class="pill mute">In service</span>'
}[st]);

const calPill = (st) => ({
  ok: '<span class="pill ok">Valid</span>',
  due: '<span class="pill low">Due soon</span>',
  exp: '<span class="pill out">Expired</span>',
  na: '<span class="pill mute">Not required</span>'
}[st]);

const poPill = (s) => ({
  draft: '<span class="pill mute">Draft</span>',
  ordered: '<span class="pill ord">Ordered</span>',
  shipped: '<span class="pill br">In transit</span>',
  received: '<span class="pill ok">Received</span>',
  cancelled: '<span class="pill out">Cancelled</span>'
}[s]);

/**
 * Empty state message
 */
const empty = (i, t, s) => `
  <div class="empty">
    <div class="e-i">${i}</div>
    <div class="e-t">${esc(t)}</div>
    <div class="e-s">${esc(s || '')}</div>
  </div>
`;

/**
 * "More rows" link for dashboard lists
 */
function moreRow(total, label, action) {
  if (total <= ROWCAP) return '';
  return `
    <button class="morerow" onclick="${action}">
      View all ${total} ${label}
      <span>+${total - ROWCAP} more</span>
    </button>
  `;
}

/**
 * Progress bar
 */
function progressBar(value, max = 100, status = 'ok') {
  const pct = Math.min(100, (value / max) * 100);
  const className = pct >= 100 ? 'warn' : status === 'ok' ? 'ok' : 'warn';
  return `
    <div class="bar-use">
      <i class="${className}" style="width:${pct}%"></i>
    </div>
  `;
}

/**
 * Key-value display
 */
function kvRow(label, value, isBold = false) {
  return `
    <div class="kv">
      <span>${esc(label)}</span>
      <${isBold ? 'b' : 'span'}>${esc(String(value))}</${isBold ? 'b' : 'span'}>
    </div>
  `;
}

/**
 * Warranty status pill
 */
const warPill = (s) => ({
  ok: '<span class="pill ok">Under warranty</span>',
  soon: '<span class="pill low">Expiring</span>',
  exp: '<span class="pill out">Expired</span>',
  none: '<span class="pill mute">Not covered</span>'
}[s]);

/**
 * Number stepper - minus / input / plus
 * @param {string} id - Input element id
 * @param {number} val - Starting value
 * @param {number} [max] - Optional ceiling
 */
function stepper(id, val, max) {
  return `
    <div class="step">
      <button type="button" onclick="bump('${id}',-1)">−</button>
      <input id="${id}" type="number" inputmode="numeric" value="${val}" min="0" ${max != null ? `max="${max}"` : ''}>
      <button type="button" onclick="bump('${id}',1)">＋</button>
    </div>
  `;
}

/**
 * Step a stepper input up or down, respecting its bounds
 */
function bump(id, d) {
  const i = document.getElementById(id);
  let v = (parseInt(i.value) || 0) + d;

  if (v < 0) v = 0;
  if (i.max && v > +i.max) v = +i.max;

  i.value = v;
  i.dispatchEvent(new Event('input'));
}

/**
 * Part <option> list for the current site, alphabetical
 * @param {string} [sel] - Part id to pre-select
 */
function partOpts(sel) {
  return S.parts
    .filter((p) => VIEW.site === 'all' || p.site === VIEW.site)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (p) => `<option value="${p.id}" ${sel === p.id ? 'selected' : ''}>
        ${esc(p.name)} — ${esc(p.sku)} (${p.qty} ${esc(p.unit)} @ ${esc(p.site)})
      </option>`
    )
    .join('');
}

/**
 * Select one button in a .pick group
 */
function pickOne(b) {
  b.parentNode.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
  b.classList.add('on');
}

/* ---------- bulk selection ---------- */

/**
 * Ids of the rows currently listed, in the order they appear on screen
 */
function listedIds() {
  if (VIEW.page === 'parts') return filterParts().map((p) => p.id);
  if (VIEW.page === 'tools') return filterTools().map((t) => t.id);
  return [];
}

/**
 * Selection tick box for one row. Only roles that can delete ever see it.
 */
function selBox(id) {
  if (!can('del')) return '';
  return `
    <label class="selbox">
      <input type="checkbox" onchange="toggleSel('${id}',this.checked)" ${VIEW.sel.includes(id) ? 'checked' : ''}>
    </label>
  `;
}

/**
 * Header tick box - selects or clears every row currently listed
 */
function selAllBox() {
  if (!can('del')) return '';
  const ids = listedIds();
  const on = ids.length && ids.every((id) => VIEW.sel.includes(id));

  return `
    <label class="selbox">
      <input type="checkbox" onchange="toggleSelAll(this.checked)" ${on ? 'checked' : ''}>
    </label>
  `;
}

/**
 * Add or remove one row from the selection
 */
function toggleSel(id, on) {
  VIEW.sel = on ? [...new Set([...VIEW.sel, id])] : VIEW.sel.filter((x) => x !== id);
  repaint();
}

/**
 * Tick or clear every row currently listed, leaving filtered-out rows alone
 */
function toggleSelAll(on) {
  const ids = listedIds();
  VIEW.sel = on
    ? [...new Set([...VIEW.sel, ...ids])]
    : VIEW.sel.filter((x) => !ids.includes(x));
  repaint();
}

/**
 * Drop the selection and repaint
 */
function clearSel() {
  VIEW.sel = [];
  repaint();
}

/**
 * Strip above a list showing what is ticked, with the bulk delete action
 * @param {string} action - JS call that opens the delete confirmation
 */
function selBar(action) {
  if (!can('del') || !VIEW.sel.length) return '';

  return `
    <div class="selbar">
      <span><b>${VIEW.sel.length}</b> selected</span>
      <button class="btn sm" onclick="clearSel()">Clear</button>
      <button class="btn sm dgr" onclick="${action}">✕ Delete selected</button>
    </div>
  `;
}
