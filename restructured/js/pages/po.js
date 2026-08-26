/**
 * js/pages/po.js - Purchase orders: reorder suggestions, list, editor and status flow
 */

/**
 * Render the purchase orders page
 */
function renderPO() {
  const O = S.pos.filter(inSite);
  const c = {
    all: O.length,
    draft: O.filter((o) => o.status === 'draft').length,
    ordered: O.filter((o) => o.status === 'ordered').length,
    shipped: O.filter((o) => o.status === 'shipped').length,
    received: O.filter((o) => o.status === 'received').length
  };

  const sug = sugList();
  const committed = O
    .filter((o) => ['ordered', 'shipped'].includes(o.status))
    .reduce((a, o) => a + poTotal(o), 0);

  const tabs = [
    ['all', 'All'], ['draft', 'Draft'], ['ordered', 'Ordered'],
    ['shipped', 'In transit'], ['received', 'Received']
  ];

  $('#page').innerHTML = `
    <div class="kpis">
      <div class="kpi ord">
        <div class="kpi-l">Open orders</div>
        <div class="kpi-v">${c.draft + c.ordered + c.shipped}</div>
        <div class="kpi-d">${c.draft} awaiting approval</div>
      </div>
      <div class="kpi br">
        <div class="kpi-l">Committed spend</div>
        <div class="kpi-v" style="font-size:22px">${money(committed)}</div>
        <div class="kpi-d">Ordered but not received</div>
      </div>
      <div class="kpi ${sug.length ? 'low' : 'ok'}">
        <div class="kpi-l">Reorder suggested</div>
        <div class="kpi-v">${sug.length}</div>
        <div class="kpi-d">Below min with no order</div>
      </div>
      <div class="kpi ok">
        <div class="kpi-l">Received (all time)</div>
        <div class="kpi-v">${c.received}</div>
        <div class="kpi-d">Closed orders</div>
      </div>
    </div>

    ${sug.length && can('po')
      ? `<div class="card">
          <div class="card-h">
            <div>
              <div class="card-t">Reorder suggestions</div>
              <div class="card-s">Below minimum and not on any open order</div>
            </div>
            <div class="r"><button class="btn pri sm" onclick="poModal(null,'auto')">Raise order for all</button></div>
          </div>
          <div class="card-b flush">
            ${sug.slice(0, ROWCAP).map(sugRow).join('')}
            ${moreRow(sug.length, 'suggestions', 'sugModal()')}
          </div>
        </div>`
      : ''}

    <div class="tabs">
      ${tabs.map(([k, l]) =>
        `<button data-tab="${k}" class="${VIEW.tab === k ? 'on' : ''}">${l} ${c[k] ? `(${c[k]})` : ''}</button>`
      ).join('')}
    </div>

    <div class="tools">
      <div class="srch">
        <input id="q" placeholder="Search PO number or supplier…" value="${esc(VIEW.q)}">
      </div>
      ${can('po') ? '<button class="btn pri" onclick="poModal()">＋ New order</button>' : ''}
    </div>
    <div class="card"><div class="card-b flush" id="listHost">${poList()}</div></div>
  `;
}

/**
 * One reorder suggestion row
 */
function sugRow(p) {
  const need = reorderQty(p);

  return `
    <div class="al">
      <div class="al-i ${stockState(p) === 'out' ? 'out' : 'low'}">▤</div>
      <div style="min-width:0">
        <div class="al-t">${esc(p.name)}</div>
        <div class="al-s">${esc(p.sku)} · on hand ${p.qty} of min ${p.min} · lead ${p.lt}d · ${esc(p.sup)}</div>
      </div>
      <div class="al-r">
        <div class="mono" style="font-weight:700">+${need} ${esc(p.unit)}</div>
        <div style="color:var(--ink3)">${money(need * p.cost)}</div>
      </div>
    </div>
  `;
}

/**
 * All reorder suggestions in one sheet
 */
function sugModal() {
  const sug = sugList();
  const tot = sug.reduce((a, p) => a + reorderQty(p) * p.cost, 0);

  openModal('Reorder suggestions', `${sug.length} parts below minimum with no order raised`,
    `<div style="margin:-16px">${sug.map(sugRow).join('') || empty('✓', 'Nothing to reorder', '')}</div>`,
    `<button class="btn" onclick="closeModal()">Close</button>
     ${sug.length && can('po')
       ? `<button class="btn pri" onclick="poModal(null,'auto')">Raise order · ${money(tot).replace('.00', '')}</button>`
       : ''}`);
}

/**
 * Purchase order list, newest first
 */
function poList() {
  const q = VIEW.q.toLowerCase();

  const L = S.pos
    .filter(inSite)
    .filter((o) => VIEW.tab === 'all' || o.status === VIEW.tab)
    .filter((o) => !q || (o.no + ' ' + o.sup).toLowerCase().includes(q))
    .sort((a, b) => b.created - a.created);

  if (!L.length) {
    return empty('⇄', 'No orders here', 'Raise one from a reorder suggestion or the New order button.');
  }

  const act = (o) => `<button class="btn sm" data-menu onclick="poMenu(event,'${o.id}')">Actions ▾</button>`;

  const eta = (o) => {
    if (o.status === 'received') return '<span style="color:var(--ok)">Received</span>';
    const d = daysTo(o.eta);
    return `<span style="color:${d < 0 ? 'var(--out)' : 'var(--ink)'}">${fmtD(o.eta)}${d < 0 ? ` (${Math.abs(d)}d late)` : ''}</span>`;
  };

  return `
    <table class="tbl">
      <thead>
        <tr>
          <th>Order</th><th>Supplier</th><th>Site</th><th class="num">Lines</th>
          <th class="num">Value</th><th>Expected</th><th>Status</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${L.map((o) => `
          <tr>
            <td>
              <div class="pname mono">${esc(o.no)}</div>
              <div class="psku">raised ${fmtDT(o.created)}</div>
            </td>
            <td>${esc(o.sup)}</td>
            <td class="mono" style="font-size:12px">${esc(o.site)}</td>
            <td class="num">${o.lines.length}</td>
            <td class="num"><b>${money(poTotal(o))}</b></td>
            <td class="mono" style="font-size:12px">${eta(o)}</td>
            <td>${poPill(o.status)}</td>
            <td style="text-align:right">${act(o)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="rows">
      ${L.map((o) => `
        <div class="row">
          <div class="row-m">
            <div style="display:flex;gap:8px;align-items:flex-start">
              <div style="flex:1;min-width:0">
                <div class="pname mono">${esc(o.no)}</div>
                <div class="psku">${esc(o.sup)} · ${esc(o.site)} · ${o.lines.length} line${o.lines.length > 1 ? 's' : ''}</div>
              </div>
              ${poPill(o.status)}
            </div>
            <div style="margin-top:7px;font-size:12.5px">
              Value <b class="mono">${money(poTotal(o))}</b> ·
              expected <span class="mono">${eta(o)}</span>
            </div>
            <div class="row-x">${act(o)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Row action menu for an order
 */
function poMenu(e, id) {
  e.stopPropagation();
  const o = poById(id);

  const nxt = {
    draft: ['ordered', 'Mark as ordered'],
    ordered: ['shipped', 'Mark as in transit'],
    shipped: ['received', 'Receive into stock']
  }[o.status];

  const needAppr = o.status === 'draft' && !can('poApprove');

  openMenu(e.currentTarget, `
    <div class="mh">${esc(o.no)}</div>
    <button onclick="closeMenu();poDetail('${id}')">◉ View order</button>
    ${nxt && can('po') && !needAppr
      ? `<button onclick="closeMenu();poAdvance('${id}','${nxt[0]}')">→ ${nxt[1]}</button>` : ''}
    ${needAppr ? '<div class="mh" style="color:var(--low)">Manager approval required</div>' : ''}
    ${can('po') && o.status === 'draft' ? `<button onclick="closeMenu();poModal('${id}')">✎ Edit order</button>` : ''}
    ${can('po') && ['draft', 'ordered'].includes(o.status)
      ? `<div class="div"></div>
         <button class="dgr" onclick="closeMenu();poCancel('${id}')">✕ Cancel order</button>` : ''}
  `);
}

/**
 * Full detail sheet for an order
 */
function poDetail(id) {
  const o = poById(id);

  openModal(o.no, o.sup + ' · ' + siteName(o.site), `
    <div class="kv"><span>Status</span><b>${poPill(o.status)}</b></div>
    <div class="kv"><span>Raised</span><b>${fmtDT(o.created)} by ${esc(o.by)}</b></div>
    <div class="kv"><span>Expected</span><b class="mono">${fmtD(o.eta)}</b></div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
      color:var(--ink3);margin:16px 0 6px">Lines</div>
    ${o.lines.map((l) => {
      const p = partById(l.part);
      return `
        <div class="kv">
          <span style="color:var(--ink)">${esc(p ? p.name : 'Deleted part')}<br>
            <span class="mono" style="font-size:11px;color:var(--ink3)">
              ${esc(p ? p.sku : '')} · ${l.qty} × ${money(l.cost)}</span>
          </span>
          <b class="mono">${money(l.qty * l.cost)}</b>
        </div>
      `;
    }).join('')}
    <div class="kv" style="border-top:2px solid var(--line);margin-top:6px;padding-top:10px">
      <span style="font-weight:700;color:var(--ink)">Order total</span>
      <b class="mono" style="font-size:16px">${money(poTotal(o))}</b>
    </div>
    ${o.notes ? `<div style="margin-top:12px;font-size:12.5px;color:var(--ink2)">${esc(o.notes)}</div>` : ''}
  `, `
    <button class="btn" onclick="closeModal()">Close</button>
    ${o.status === 'shipped' && can('receive')
      ? `<button class="btn pri" onclick="poAdvance('${id}','received')">Receive into stock</button>` : ''}
  `);
}

/* ---------- order editor ---------- */

// Lines being edited, flushed to the order on save
let poDraft = [];

/**
 * Raise or edit an order
 * @param {string} [id] - Existing order to edit
 * @param {string} [seedPart] - A part id to start from, or 'auto' for every suggestion
 */
function poModal(id, seedPart) {
  if (!can('po')) return toast('Your role cannot raise orders', 'bad');

  const o = id ? poById(id) : null;

  if (o) {
    poDraft = o.lines.map((l) => ({ ...l }));
  } else if (seedPart === 'auto') {
    poDraft = sugList().map((p) => ({ part: p.id, qty: reorderQty(p), cost: p.cost }));
  } else if (seedPart) {
    const p = partById(seedPart);
    poDraft = [{ part: p.id, qty: reorderQty(p), cost: p.cost }];
  } else {
    poDraft = [];
  }

  const sup = o ? o.sup : (poDraft[0] ? partById(poDraft[0].part).sup : '');
  const site = o ? o.site : (VIEW.site === 'all' ? S.sites[0].id : VIEW.site);
  const lead = poDraft.length
    ? Math.max(...poDraft.map((l) => (partById(l.part) || {}).lt || 14))
    : 14;

  openModal(o ? 'Edit order' : 'New purchase order', o ? o.no : 'Raise a supply request', `
    <div class="f2">
      <div class="fld"><label>Supplier</label><input id="poSup" value="${esc(sup)}" placeholder="Supplier name"></div>
      <div class="fld">
        <label>Deliver to</label>
        <select id="poSite">
          ${S.sites.map((s) => `<option value="${s.id}" ${site === s.id ? 'selected' : ''}>${esc(s.code)} — ${esc(s.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="fld">
      <label>Expected delivery</label>
      <input id="poEta" type="date" value="${o ? o.eta : addD(lead)}">
      <div class="hlp">Pre-filled from the longest supplier lead time on this order.</div>
    </div>
    <div class="fld">
      <label>Lines</label>
      <div id="poLines"></div>
      <select class="sel" id="poAdd" style="width:100%;margin-top:8px" onchange="poAddLine()">
        <option value="">＋ Add a part to this order…</option>${partOpts()}
      </select>
    </div>
    <div class="fld"><label>Notes</label><textarea id="poNotes">${o ? esc(o.notes) : ''}</textarea></div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="savePO('${id || ''}')">${o ? 'Save order' : 'Create order'}</button>
  `);

  poLines();
}

/**
 * Redraw the draft lines and running total
 */
function poLines() {
  const h = $('#poLines');
  if (!h) return;

  if (!poDraft.length) {
    h.innerHTML = `
      <div style="padding:14px;text-align:center;color:var(--ink3);font-size:12.5px;
        border:1px dashed var(--line2);border-radius:9px">No lines yet — add a part below.</div>
    `;
    return;
  }

  h.innerHTML = poDraft.map((l, i) => {
    const p = partById(l.part);
    if (!p) return '';

    return `
      <div style="display:flex;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${esc(p.name)}</div>
          <div class="psku">${esc(p.sku)} · on hand ${p.qty}/${p.min} · ${money(l.cost)} each</div>
        </div>
        <input type="number" value="${l.qty}" min="1" style="width:64px;padding:7px;border:1px solid var(--line);
          border-radius:7px;text-align:center;font-family:var(--mono)" oninput="poQty(${i},this.value)">
        <button class="btn sm" onclick="poDel(${i})">✕</button>
      </div>
    `;
  }).join('') + `
    <div style="display:flex;justify-content:space-between;padding-top:10px;font-size:14px">
      <b>Order total</b>
      <b class="mono">${money(poDraft.reduce((a, l) => a + l.qty * l.cost, 0))}</b>
    </div>
  `;
}

/**
 * Add the part chosen in the picker to the draft
 */
function poAddLine() {
  const id = $('#poAdd').value;
  if (!id) return;
  $('#poAdd').value = '';

  if (poDraft.some((l) => l.part === id)) return toast('Already on this order', 'bad');

  const p = partById(id);
  poDraft.push({ part: id, qty: reorderQty(p), cost: p.cost });

  // First line sets the supplier if one has not been typed
  if (!$('#poSup').value) $('#poSup').value = p.sup;

  poLines();
}

/**
 * Change a draft line quantity
 */
function poQty(i, v) {
  poDraft[i].qty = Math.max(1, parseInt(v) || 1);
  poLines();
}

/**
 * Remove a draft line
 */
function poDel(i) {
  poDraft.splice(i, 1);
  poLines();
}

/**
 * Save the order editor
 */
function savePO(id) {
  const sup = $('#poSup').value.trim();
  const site = $('#poSite').value;
  const eta = $('#poEta').value;
  const notes = $('#poNotes').value.trim();

  if (!sup) return toast('Supplier is required', 'bad');
  if (!poDraft.length) return toast('Add at least one line', 'bad');

  if (id) {
    const o = poById(id);
    Object.assign(o, { sup, site, eta, notes, lines: poDraft.map((l) => ({ ...l })) });
    logIt('po',
      `Updated ${o.no} — ${o.lines.length} line${o.lines.length > 1 ? 's' : ''}, ${money(poTotal(o))}`,
      site, { po: o.id });
  } else {
    S.cfg.poSeq = (S.cfg.poSeq || 0) + 1;

    const d = new Date();
    const no = 'PO-' + String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(S.cfg.poSeq).padStart(3, '0');

    const o = {
      id: uid('po'), no, sup, site, status: 'draft', created: Date.now(),
      eta, by: VIEW.user.u, notes, lines: poDraft.map((l) => ({ ...l }))
    };
    S.pos.unshift(o);

    logIt('po',
      `Created ${no} — ${sup}, ${o.lines.length} line${o.lines.length > 1 ? 's' : ''}, ${money(poTotal(o))}`,
      site, { po: o.id });
  }

  poDraft = [];
  saveState();
  closeModal();
  buildNav();
  render();
  toast(id ? 'Order saved' : 'Order created as draft', 'good');
}

/**
 * Move an order to its next status - receiving books the stock in
 */
function poAdvance(id, to) {
  const o = poById(id);

  if (to === 'ordered' && !can('poApprove')) return toast('A manager must approve draft orders', 'bad');

  if (to === 'received') {
    let n = 0;

    o.lines.forEach((l) => {
      const p = partById(l.part);
      if (!p) return;

      p.qty += l.qty;
      p.updated = Date.now();
      n += l.qty;
      if (p.war) p.warFrom = iso(today());   // delivered batch restarts the warranty

      logIt('receive', `Received ${l.qty} × ${p.name} on ${o.no}`, p.site, {
        part: p.id,
        qty: l.qty,
        value: +(l.qty * l.cost).toFixed(2)
      });
    });

    o.status = 'received';
    logIt('po', `${o.no} received — ${n} items booked into ${o.site} store`, o.site, { po: o.id });

    saveState();
    closeModal();
    buildNav();
    render();
    return toast(`${o.no} received — ${n} items added to stock`, 'good');
  }

  o.status = to;
  logIt('po', `${o.no} marked as ${to === 'shipped' ? 'in transit' : to}`, o.site, { po: o.id });

  saveState();
  closeModal();
  buildNav();
  render();
  toast(`${o.no} → ${to === 'shipped' ? 'in transit' : to}`, 'good');
}

/**
 * Confirm cancelling an order
 */
function poCancel(id) {
  const o = poById(id);

  openModal('Cancel order', o.no, `
    <p style="font-size:13.5px;margin:0">
      Cancel <b>${esc(o.no)}</b> to ${esc(o.sup)}? Stock will not be booked in and the order closes.
    </p>
  `, `
    <button class="btn" onclick="closeModal()">Keep order</button>
    <button class="btn dgr" onclick="doPoCancel('${id}')">Cancel order</button>
  `);
}

/**
 * Cancel an order
 */
function doPoCancel(id) {
  const o = poById(id);
  o.status = 'cancelled';

  logIt('po', `Cancelled ${o.no} (${o.sup})`, o.site, { po: o.id });

  saveState();
  closeModal();
  buildNav();
  render();
  toast('Order cancelled', 'good');
}
