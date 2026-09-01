/**
 * js/pages/parts.js - Spare parts inventory: list, detail, editor and stock movements
 */

/**
 * Render the spare parts page
 */
function renderParts() {
  const cats = [...new Set(S.parts.map((p) => p.cat))].sort();

  $('#page').innerHTML = `
    <div class="tools">
      <div class="srch">
        <input id="q" placeholder="Search part name, SKU or bin…" value="${esc(VIEW.q)}">
      </div>
      <select class="sel" data-filter="cat">
        <option value="all">All categories</option>
        ${cats.map((c) => `<option ${VIEW.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select>
      <select class="sel" data-filter="stock">
        <option value="all" ${VIEW.stock === 'all' ? 'selected' : ''}>All stock</option>
        <option value="low" ${VIEW.stock === 'low' ? 'selected' : ''}>Below minimum</option>
        <option value="out" ${VIEW.stock === 'out' ? 'selected' : ''}>Out of stock</option>
        <option value="ok" ${VIEW.stock === 'ok' ? 'selected' : ''}>Healthy</option>
      </select>
      ${can('issue') ? '<button class="btn pri" onclick="issueModal()">Issue</button>' : ''}
      ${can('receive') ? '<button class="btn" onclick="receiveModal()">Receive</button>' : ''}
      ${can('edit') ? '<button class="btn" onclick="partModal()">＋ Add part</button>' : ''}
    </div>
    <div class="card"><div class="card-b flush" id="listHost">${partsList()}</div></div>
  `;
}

/**
 * Parts matching the current search and filters, worst stock state first
 */
function filterParts() {
  const q = VIEW.q.toLowerCase();

  return S.parts
    .filter((p) => inSite(p))
    .filter((p) => VIEW.cat === 'all' || p.cat === VIEW.cat)
    .filter((p) =>
      VIEW.stock === 'all' ||
      stockState(p) === VIEW.stock ||
      (VIEW.stock === 'low' && stockState(p) === 'out'))
    .filter((p) => !q || (p.name + ' ' + p.sku + ' ' + p.bin + ' ' + p.sup).toLowerCase().includes(q))
    .sort((a, b) => {
      const r = { out: 0, low: 1, ok: 2 };
      return r[stockState(a)] - r[stockState(b)] || a.name.localeCompare(b.name);
    });
}

/**
 * Parts list - table on desktop, cards on mobile
 */
function partsList() {
  const L = filterParts();
  if (!L.length) return selBar('delSelParts()') + empty('▤', 'No parts match', 'Try clearing the search or filters.');

  const act = (p) => `<button class="btn sm" data-menu onclick="partMenu(event,'${p.id}')">Actions ▾</button>`;

  return `
    ${selBar('delSelParts()')}
    <table class="tbl">
      <thead>
        <tr>
          ${can('del') ? `<th style="width:34px">${selAllBox()}</th>` : ''}
          <th style="width:52px"></th><th>Part</th><th>Category</th><th>Bin</th><th>Site</th>
          <th style="width:150px">Level</th><th class="num">On hand</th><th class="num">Value</th>
          <th>Status</th><th>Warranty</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${L.map((p) => `
          <tr>
            ${can('del') ? `<td>${selBox(p.id)}</td>` : ''}
            <td>${thumb(p, p.cat)}</td>
            <td>
              <div class="pname">${esc(p.name)}</div>
              <div class="psku">${esc(p.sku)}</div>
            </td>
            <td style="color:var(--ink2)">${esc(p.cat)}</td>
            <td class="mono" style="font-size:12px">${esc(p.bin)}</td>
            <td class="mono" style="font-size:12px">${esc(p.site)}</td>
            <td>
              ${sbar(p)}
              <div class="sb-lg">
                <span>min ${p.min}</span>
                <span>${p.sup ? esc(p.sup.slice(0, 12)) : ''}</span>
              </div>
            </td>
            <td class="num"><b>${p.qty}</b> <span style="color:var(--ink3);font-size:11px">${esc(p.unit)}</span></td>
            <td class="num" style="color:var(--ink2)">${money(p.qty * p.cost)}</td>
            <td>${stPill(stockState(p))}</td>
            <td>
              ${warPill(warState(p))}
              ${warUntil(p) ? `<div class="psku">${fmtD(warUntil(p))}</div>` : ''}
            </td>
            <td style="text-align:right">${act(p)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="rows">
      ${L.map((p) => `
        <div class="row">
          ${selBox(p.id)}
          ${thumb(p, p.cat)}
          <div class="row-m">
            <div style="display:flex;gap:8px;align-items:flex-start">
              <div style="flex:1;min-width:0">
                <div class="pname">${esc(p.name)}</div>
                <div class="psku">${esc(p.sku)} · ${esc(p.cat)} · bin ${esc(p.bin)}</div>
              </div>
              ${stPill(stockState(p))}
            </div>
            <div style="margin-top:9px">
              ${sbar(p)}
              <div class="sb-lg">
                <span>on hand <b style="color:var(--ink)">${p.qty} ${esc(p.unit)}</b> · min ${p.min}</span>
                <span>${esc(p.site)} · ${money(p.qty * p.cost)}</span>
              </div>
            </div>
            <div class="row-x">${act(p)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Row action menu for a part
 */
function partMenu(e, id) {
  e.stopPropagation();
  const p = partById(id);

  openMenu(e.currentTarget, `
    <div class="mh">${esc(p.sku)}</div>
    <button onclick="closeMenu();partDetail('${id}')">◉ View details</button>
    ${can('issue') ? `<button onclick="closeMenu();issueModal('${id}')">↑ Issue stock</button>` : ''}
    ${can('receive') ? `<button onclick="closeMenu();receiveModal('${id}')">↓ Receive stock</button>` : ''}
    ${can('adjust') ? `<button onclick="closeMenu();adjustModal('${id}')">≠ Adjust / stock count</button>` : ''}
    ${can('po') && stockState(p) !== 'ok'
      ? `<button onclick="closeMenu();poModal(null,'${id}')">⇄ Add to purchase order</button>` : ''}
    <button onclick="closeMenu();go('war')">▣ Warranty register</button>
    ${can('edit') ? `<div class="div"></div><button onclick="closeMenu();partModal('${id}')">✎ Edit part</button>` : ''}
    ${can('del') ? `<button class="dgr" onclick="closeMenu();delPart('${id}')">✕ Delete part</button>` : ''}
  `);
}

/**
 * Full detail sheet for a part
 */
function partDetail(id) {
  const p = partById(id);
  const hist = S.log.filter((l) => l.txt.includes(p.name)).slice(0, 6);

  openModal(p.name, p.sku + ' · ' + p.cat, `
    ${photoSrc(p) ? `<img class="hero" src="${esc(photoSrc(p))}" alt="" onclick="viewPhoto('${p.id}')">` : ''}
    <div style="margin-bottom:14px">
      ${sbar(p)}
      <div class="sb-lg">
        <span>on hand <b style="color:var(--ink)">${p.qty} ${esc(p.unit)}</b></span>
        <span>minimum ${p.min}</span>
      </div>
    </div>
    <div class="kv"><span>Status</span><b>${stPill(stockState(p))}</b></div>
    <div class="kv"><span>Site</span><b>${esc(siteName(p.site))}</b></div>
    <div class="kv"><span>Bin location</span><b class="mono">${esc(p.bin)}</b></div>
    <div class="kv"><span>Unit cost</span><b class="mono">${money(p.cost)}</b></div>
    <div class="kv"><span>Stock value</span><b class="mono">${money(p.qty * p.cost)}</b></div>
    <div class="kv"><span>Supplier</span><b>${esc(p.sup)}</b></div>
    <div class="kv"><span>Lead time</span><b>${p.lt} days</b></div>
    <div class="kv"><span>Warranty</span><b>${warPill(warState(p))}</b></div>
    ${p.war
      ? `<div class="kv"><span>Term</span><b>${p.war} months from ${fmtD(p.warFrom)}</b></div>
         <div class="kv"><span>Covered until</span><b class="mono">${fmtD(warUntil(p))}</b></div>`
      : ''}
    <div class="kv"><span>Last movement</span><b>${ago(p.updated)}</b></div>
    ${hist.length
      ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
          color:var(--ink3);margin:16px 0 4px">Recent history</div>` +
        hist.map((l) => `
          <div style="font-size:12.5px;padding:6px 0;border-bottom:1px dashed var(--line)">
            ${esc(l.txt)}
            <div style="color:var(--ink3);font-size:11.5px">${esc(l.by)} · ${ago(l.ts)}</div>
          </div>
        `).join('')
      : ''}
  `, `
    <button class="btn" onclick="closeModal()">Close</button>
    ${can('issue') ? `<button class="btn pri" onclick="issueModal('${id}')">Issue stock</button>` : ''}
  `);
}

/* ---------- issue / receive / adjust ---------- */

/**
 * Issue stock out of the store
 */
function issueModal(id) {
  if (!can('issue')) return toast('Your role cannot issue stock', 'bad');
  if (!S.parts.length) return toast('There are no parts to issue yet', 'bad');

  const first = id || (filterParts()[0] || S.parts[0]).id;

  openModal('Issue parts', 'Take stock out of the store', `
    <div class="fld">
      <label>Part</label>
      <select id="ipPart" onchange="issueSync()">${partOpts(first)}</select>
    </div>
    <div class="fld">
      <label>Quantity to issue</label>
      ${stepper('ipQty', 1)}
      <div class="hlp" id="ipHint"></div>
    </div>
    <div class="fld">
      <label>Issued to</label>
      <input id="ipTo" value="${esc(VIEW.user.name)}" placeholder="Technician name">
    </div>
    <div class="fld">
      <label>Work order / reason</label>
      <input id="ipRef" placeholder="e.g. WO-2280 PCS-2 fan replacement">
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="doIssue()">Issue stock</button>
  `);

  $('#ipQty').addEventListener('input', issueSync);
  issueSync();
}

/**
 * Live "after this issue" hint
 */
function issueSync() {
  const p = partById($('#ipPart').value);
  const q = parseInt($('#ipQty').value) || 0;
  const after = p.qty - q;

  $('#ipHint').innerHTML = `
    On hand ${p.qty} ${esc(p.unit)} →
    <b style="color:${after < 0 ? 'var(--out)' : after <= p.min ? 'var(--low)' : 'var(--ok)'}">${after} after issue</b>
    ${after < 0 ? ' — not enough stock' : after <= p.min && after >= 0 ? ' — will drop below minimum' : ''}
  `;
  $('#ipQty').max = p.qty;
}

/**
 * Commit an issue
 */
function doIssue() {
  const p = partById($('#ipPart').value);
  const q = parseInt($('#ipQty').value) || 0;
  const to = $('#ipTo').value.trim() || VIEW.user.name;
  const ref = $('#ipRef').value.trim();

  if (q < 1) return toast('Enter a quantity of 1 or more', 'bad');
  if (q > p.qty) return toast(`Only ${p.qty} ${p.unit} on hand`, 'bad');

  p.qty -= q;
  p.updated = Date.now();
  logIt('issue', `Issued ${q} × ${p.name} to ${to}${ref ? ' (' + ref + ')' : ''}`, p.site, {
    part: p.id,
    qty: q,
    value: +(q * p.cost).toFixed(2)
  });

  saveState();
  closeModal();
  buildNav();
  render();
  toast(`Issued ${q} ${p.unit} — ${p.qty} left`, 'good');
}

/**
 * Book delivered goods into the store
 */
function receiveModal(id) {
  if (!can('receive')) return toast('Your role cannot receive stock', 'bad');
  if (!S.parts.length) return toast('Add a part before receiving stock', 'bad');

  const first = id || S.parts[0].id;

  openModal('Receive stock', 'Book delivered goods into the store', `
    <div class="fld">
      <label>Part</label>
      <select id="rcPart" onchange="rcSync()">${partOpts(first)}</select>
    </div>
    <div class="fld">
      <label>Quantity received</label>
      ${stepper('rcQty', 1)}
      <div class="hlp" id="rcHint"></div>
    </div>
    <div class="fld">
      <label>Delivery note / PO reference</label>
      <input id="rcRef" placeholder="e.g. PO-2608-013">
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="doReceive()">Receive stock</button>
  `);

  $('#rcQty').addEventListener('input', rcSync);
  rcSync();
}

/**
 * Live "after this receipt" hint
 */
function rcSync() {
  const p = partById($('#rcPart').value);
  const q = parseInt($('#rcQty').value) || 0;

  $('#rcHint').innerHTML = `On hand ${p.qty} → <b style="color:var(--ok)">${p.qty + q} ${esc(p.unit)}</b> · bin ${esc(p.bin)}`;
}

/**
 * Commit a receipt
 */
function doReceive() {
  const p = partById($('#rcPart').value);
  const q = parseInt($('#rcQty').value) || 0;
  const ref = $('#rcRef').value.trim();

  if (q < 1) return toast('Enter a quantity of 1 or more', 'bad');

  p.qty += q;
  p.updated = Date.now();
  if (p.war) p.warFrom = iso(today());   // a new batch restarts the supplier warranty

  logIt('receive', `Received ${q} × ${p.name} into ${p.bin}${ref ? ' (' + ref + ')' : ''}`, p.site, {
    part: p.id,
    qty: q,
    value: +(q * p.cost).toFixed(2)
  });

  saveState();
  closeModal();
  buildNav();
  render();
  toast(`Received ${q} ${p.unit} — now ${p.qty}`, 'good');
}

/**
 * Physical stock count / correction
 */
function adjustModal(id) {
  if (!can('adjust')) return toast('Your role cannot adjust stock', 'bad');

  const p = partById(id);

  openModal('Stock count', `${p.name} · ${p.sku}`, `
    <div class="fld">
      <label>Counted quantity</label>
      ${stepper('adQty', p.qty)}
      <div class="hlp" id="adHint">System says ${p.qty} ${esc(p.unit)}</div>
    </div>
    <div class="fld">
      <label>Reason for the difference</label>
      <select id="adWhy">
        <option>Physical count correction</option>
        <option>Damaged / scrapped</option>
        <option>Found in another bin</option>
        <option>Returned unused</option>
        <option>Data entry error</option>
      </select>
    </div>
    <div class="fld">
      <label>Note</label>
      <textarea id="adNote" placeholder="Optional detail for the audit trail"></textarea>
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="doAdjust('${id}')">Save count</button>
  `);

  $('#adQty').addEventListener('input', () => {
    const q = parseInt($('#adQty').value) || 0;
    const d = q - p.qty;
    $('#adHint').innerHTML = `
      System says ${p.qty} ${esc(p.unit)} · difference
      <b style="color:${d === 0 ? 'var(--ink2)' : d > 0 ? 'var(--ok)' : 'var(--out)'}">${d > 0 ? '+' : ''}${d}</b>
    `;
  });
}

/**
 * Commit a stock count
 */
function doAdjust(id) {
  const p = partById(id);
  const q = parseInt($('#adQty').value) || 0;
  const why = $('#adWhy').value;
  const n = $('#adNote').value.trim();
  const d = q - p.qty;

  if (d === 0) {
    closeModal();
    return toast('No change recorded');
  }

  p.qty = q;
  p.updated = Date.now();
  logIt('adjust',
    `Stock count: ${p.name} ${d > 0 ? '+' : ''}${d} → ${q} ${p.unit} (${why})${n ? ' — ' + n : ''}`,
    p.site);

  saveState();
  closeModal();
  buildNav();
  render();
  toast(`Adjusted by ${d > 0 ? '+' : ''}${d}`, 'good');
}

/* ---------- part editor ---------- */

/**
 * Add or edit a part
 */
function partModal(id) {
  if (!can('edit')) return toast('Your role cannot edit parts', 'bad');

  const p = id ? partById(id) : {
    sku: '', name: '', cat: 'Battery',
    site: VIEW.site === 'all' ? S.sites[0].id : VIEW.site,
    qty: 0, min: 1, unit: 'pcs', bin: '', cost: 0, sup: '', lt: 14,
    war: 12, warFrom: iso(today()), photo: ''
  };

  const cats = [...new Set([
    ...S.parts.map((x) => x.cat),
    'Battery', 'PCS', 'HVAC', 'Electrical', 'Fire', 'Comms', 'Consumable', 'Mechanical'
  ])].sort();

  openModal(id ? 'Edit part' : 'Add part', id ? p.sku : 'New stock line', `
    ${photoField(p)}
    <div class="fld"><label>Part name</label><input id="pfName" value="${esc(p.name)}"></div>
    <div class="f2">
      <div class="fld"><label>SKU / part number</label><input id="pfSku" class="mono" value="${esc(p.sku)}"></div>
      <div class="fld"><label>Bin location</label><input id="pfBin" class="mono" value="${esc(p.bin)}" placeholder="A1-03"></div>
    </div>
    <div class="f2">
      <div class="fld">
        <label>Category</label>
        <select id="pfCat">${cats.map((c) => `<option ${p.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      </div>
      <div class="fld">
        <label>Site</label>
        <select id="pfSite">
          ${S.sites.map((s) => `<option value="${s.id}" ${p.site === s.id ? 'selected' : ''}>${esc(s.code)} — ${esc(s.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="f2">
      <div class="fld">
        <label>On hand</label>
        <input id="pfQty" type="number" value="${p.qty}" ${id ? 'disabled' : ''}>
        ${id ? '<div class="hlp">Use Issue, Receive or Stock count to change quantity.</div>' : ''}
      </div>
      <div class="fld"><label>Minimum level</label><input id="pfMin" type="number" value="${p.min}"></div>
    </div>
    <div class="f2">
      <div class="fld"><label>Unit</label><input id="pfUnit" value="${esc(p.unit)}" placeholder="pcs"></div>
      <div class="fld"><label>Unit cost (USD)</label><input id="pfCost" type="number" step="0.01" value="${p.cost}"></div>
    </div>
    <div class="f2">
      <div class="fld"><label>Supplier</label><input id="pfSup" value="${esc(p.sup)}"></div>
      <div class="fld"><label>Lead time (days)</label><input id="pfLt" type="number" value="${p.lt}"></div>
    </div>
    <div class="f2">
      <div class="fld">
        <label>Warranty (months)</label>
        <input id="pfWar" type="number" value="${p.war || 0}">
        <div class="hlp">0 = no supplier warranty</div>
      </div>
      <div class="fld">
        <label>Warranty starts</label>
        <input id="pfWarFrom" type="date" value="${p.warFrom || ''}">
        <div class="hlp">Reset automatically on each goods-in.</div>
      </div>
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="savePart('${id || ''}')">${id ? 'Save changes' : 'Add part'}</button>
  `);
}

/**
 * Save the part editor
 */
async function savePart(id) {
  const g = (k) => $('#pf' + k).value.trim();
  const n = (k) => Number($('#pf' + k).value) || 0;

  if (!g('Name')) return toast('Part name is required', 'bad');
  if (!g('Sku')) return toast('SKU is required', 'bad');

  let phDirty = false;

  if (id) {
    const p = partById(id);
    Object.assign(p, {
      name: g('Name'), sku: g('Sku'), bin: g('Bin'), cat: g('Cat'), site: g('Site'),
      min: n('Min'), unit: g('Unit') || 'pcs', cost: n('Cost'), sup: g('Sup'), lt: n('Lt'),
      war: n('War'), warFrom: $('#pfWarFrom').value || null, updated: Date.now()
    });
    phDirty = commitPhoto(p);
    logIt('edit', `Updated part ${p.name} (${p.sku})`, p.site);
  } else {
    const p = {
      id: uid('p'),
      name: g('Name'), sku: g('Sku'), bin: g('Bin'), cat: g('Cat'), site: g('Site'),
      qty: n('Qty'), min: n('Min'), unit: g('Unit') || 'pcs', cost: n('Cost'), sup: g('Sup'), lt: n('Lt'),
      war: n('War'), warFrom: $('#pfWarFrom').value || null, updated: Date.now()
    };
    phDirty = commitPhoto(p);
    S.parts.push(p);
    logIt('add', `Added part ${p.name} (${p.sku}) with ${p.qty} ${p.unit}`, p.site);
  }

  // Awaited so the outcome is known before we claim it worked. The edit is
  // already in memory either way, so still close and repaint.
  const okState = await saveState();
  const okPhotos = phDirty ? await savePhotos() : true;

  closeModal();
  buildNav();
  render();

  // On failure the storage layer has already said so in red — do not paper
  // over it with a success message.
  if (okState && okPhotos) toast(id ? 'Part updated' : 'Part added', 'good');
}

/**
 * Confirm part deletion
 */
function delPart(id) {
  const p = partById(id);

  openModal('Delete part', p.sku, `
    <p style="font-size:13.5px;margin:0">
      Deleting <b>${esc(p.name)}</b> removes it from the store and from any draft orders.
      The activity log keeps the history.
    </p>
  `, `
    <button class="btn" onclick="closeModal()">Keep it</button>
    <button class="btn dgr" onclick="doDelPart('${id}')">Delete part</button>
  `);
}

/**
 * Strip one part out of the store: its device photo, its stock line and any
 * order lines pointing at it. Logs the removal; the caller saves and repaints.
 */
function removePart(p) {
  if (p.photo && !/^https?:/i.test(p.photo)) delete PH[p.photo];

  S.parts = S.parts.filter((x) => x.id !== p.id);
  S.pos.forEach((o) => {
    o.lines = o.lines.filter((l) => l.part !== p.id);
  });
  VIEW.sel = VIEW.sel.filter((x) => x !== p.id);

  logIt('del', `Deleted part ${p.name} (${p.sku})`, p.site);
}

/**
 * Delete a part, its device photo and any order lines pointing at it
 */
function doDelPart(id) {
  removePart(partById(id));

  savePhotos();
  saveState();
  closeModal();
  buildNav();
  render();
  toast('Part deleted', 'good');
}

/**
 * Confirm deletion of everything ticked in the list
 */
function delSelParts() {
  if (!can('del')) return toast('Only a manager can delete parts', 'bad');

  const L = VIEW.sel.map(partById).filter(Boolean);
  if (!L.length) return toast('Nothing is selected', 'bad');

  openModal('Delete selected parts', `${L.length} stock line${L.length > 1 ? 's' : ''}`, `
    <p style="font-size:13.5px;margin:0 0 10px">
      These parts leave the store and any draft orders. The activity log keeps the history.
    </p>
    ${L.map((p) => `
      <div class="kv"><span>${esc(p.name)}</span><b class="mono">${esc(p.sku)}</b></div>
    `).join('')}
  `, `
    <button class="btn" onclick="closeModal()">Keep them</button>
    <button class="btn dgr" onclick="doDelSelParts()">Delete ${L.length} part${L.length > 1 ? 's' : ''}</button>
  `);
}

/**
 * Delete every ticked part
 */
function doDelSelParts() {
  const L = VIEW.sel.map(partById).filter(Boolean);
  L.forEach(removePart);

  savePhotos();
  saveState();
  closeModal();
  buildNav();
  render();
  toast(`Deleted ${L.length} part${L.length > 1 ? 's' : ''}`, 'good');
}
