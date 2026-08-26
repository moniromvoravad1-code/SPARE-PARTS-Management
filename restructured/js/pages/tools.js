/**
 * js/pages/tools.js - Tool register: list, detail, editor and check in / out
 */

/**
 * Render the tools page
 */
function renderTools() {
  const T = S.tools.filter(inSite);
  const c = {
    all: T.length,
    in: T.filter((t) => toolState(t) === 'in').length,
    out: T.filter((t) => t.status === 'out').length,
    over: T.filter((t) => toolState(t) === 'over').length,
    maint: T.filter((t) => t.status === 'maint').length
  };

  const tabs = [
    ['all', 'All tools'], ['in', 'Available'], ['out', 'Checked out'],
    ['over', 'Overdue'], ['maint', 'In service']
  ];

  $('#page').innerHTML = `
    <div class="tabs">
      ${tabs.map(([k, l]) =>
        `<button data-tab="${k}" class="${VIEW.tab === k ? 'on' : ''}">${l} ${c[k] ? `(${c[k]})` : ''}</button>`
      ).join('')}
    </div>
    <div class="tools">
      <div class="srch">
        <input id="q" placeholder="Search tool, code or holder…" value="${esc(VIEW.q)}">
      </div>
      ${can('checkout') ? '<button class="btn pri" onclick="checkoutModal()">⚒ Check out</button>' : ''}
      ${can('checkout') ? '<button class="btn" onclick="checkinModal()">↩ Check in</button>' : ''}
      ${can('edit') ? '<button class="btn" onclick="toolModal()">＋ Add tool</button>' : ''}
    </div>
    <div class="card"><div class="card-b flush" id="listHost">${toolsList()}</div></div>
  `;
}

/**
 * Tools matching the current tab and search, most urgent first
 */
function filterTools() {
  const q = VIEW.q.toLowerCase();

  return S.tools
    .filter(inSite)
    .filter((t) => VIEW.tab === 'all' || toolState(t) === VIEW.tab || (VIEW.tab === 'out' && t.status === 'out'))
    .filter((t) => !q || (t.name + ' ' + t.code + ' ' + t.holder + ' ' + t.cat).toLowerCase().includes(q))
    .sort((a, b) => {
      const r = { over: 0, out: 1, maint: 2, in: 3 };
      return r[toolState(a)] - r[toolState(b)] || a.code.localeCompare(b.code);
    });
}

/**
 * Tools list - table on desktop, cards on mobile
 */
function toolsList() {
  const L = filterTools();
  if (!L.length) return empty('⚒', 'No tools match', 'Try another tab or clear the search.');

  const act = (t) => `<button class="btn sm" data-menu onclick="toolMenu(event,'${t.id}')">Actions ▾</button>`;

  const due = (t) => {
    if (t.status !== 'out' || !t.dueAt) return '—';
    const d = daysTo(t.dueAt);
    return `<span style="color:${d < 0 ? 'var(--out)' : 'var(--ink)'};font-weight:${d < 0 ? '700' : '400'}">
      ${fmtD(t.dueAt)}${d < 0 ? ` (${Math.abs(d)}d late)` : ''}</span>`;
  };

  return `
    <table class="tbl">
      <thead>
        <tr>
          <th style="width:52px"></th><th>Tool</th><th>Category</th><th>Site</th><th>Held by</th>
          <th>Due back</th><th>Calibration</th><th>Status</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${L.map((t) => `
          <tr>
            <td>${thumb(t, t.code.replace('TL-', ''))}</td>
            <td>
              <div class="pname">${esc(t.name)}</div>
              <div class="psku">${esc(t.code)}</div>
            </td>
            <td style="color:var(--ink2)">${esc(t.cat)}</td>
            <td class="mono" style="font-size:12px">${esc(t.site)}</td>
            <td>${t.holder ? esc(t.holder) : '<span style="color:var(--ink3)">—</span>'}</td>
            <td class="mono" style="font-size:12px">${due(t)}</td>
            <td>
              ${calPill(calState(t))}
              ${t.calNext ? `<div class="psku">${fmtD(t.calNext)}</div>` : ''}
            </td>
            <td>${tlPill(toolState(t))}</td>
            <td style="text-align:right">${act(t)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="rows">
      ${L.map((t) => `
        <div class="row">
          ${thumb(t, t.code.replace('TL-', ''))}
          <div class="row-m">
            <div style="display:flex;gap:8px;align-items:flex-start">
              <div style="flex:1;min-width:0">
                <div class="pname">${esc(t.name)}</div>
                <div class="psku">${esc(t.code)} · ${esc(t.cat)} · ${esc(t.site)}</div>
              </div>
              ${tlPill(toolState(t))}
            </div>
            ${t.status === 'out'
              ? `<div style="margin-top:7px;font-size:12.5px">
                  Held by <b>${esc(t.holder)}</b> ·
                  due <span class="mono" style="color:${daysTo(t.dueAt) < 0 ? 'var(--out)' : 'var(--ink2)'}">${fmtD(t.dueAt)}</span>
                </div>`
              : ''}
            <div style="margin-top:7px;font-size:12px;color:var(--ink3)">
              Calibration ${calPill(calState(t))}
              ${t.calNext ? `<span class="mono"> ${fmtD(t.calNext)}</span>` : ''}
            </div>
            <div class="row-x">${act(t)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Row action menu for a tool
 */
function toolMenu(e, id) {
  e.stopPropagation();
  const t = toolById(id);

  openMenu(e.currentTarget, `
    <div class="mh">${esc(t.code)}</div>
    <button onclick="closeMenu();toolDetail('${id}')">◉ View details</button>
    ${can('checkout') && t.status === 'in' ? `<button onclick="closeMenu();checkoutModal('${id}')">⚒ Check out</button>` : ''}
    ${can('checkout') && t.status === 'out' ? `<button onclick="closeMenu();checkinModal('${id}')">↩ Check in</button>` : ''}
    ${can('cal') && t.calInt ? `<button onclick="closeMenu();calModal('${id}')">◎ Record calibration</button>` : ''}
    ${can('edit')
      ? `<button onclick="closeMenu();svcToggle('${id}')">${t.status === 'maint' ? '✓ Return to service' : '⚑ Send for service'}</button>`
      : ''}
    ${can('edit') ? `<div class="div"></div><button onclick="closeMenu();toolModal('${id}')">✎ Edit tool</button>` : ''}
    ${can('del') ? `<button class="dgr" onclick="closeMenu();delTool('${id}')">✕ Delete tool</button>` : ''}
  `);
}

/**
 * Full detail sheet for a tool
 */
function toolDetail(id) {
  const t = toolById(id);

  openModal(t.name, t.code + ' · ' + t.cat, `
    ${photoSrc(t) ? `<img class="hero" src="${esc(photoSrc(t))}" alt="" onclick="viewPhoto('${t.id}')">` : ''}
    <div class="kv"><span>Status</span><b>${tlPill(toolState(t))}</b></div>
    <div class="kv"><span>Home site</span><b>${esc(siteName(t.site))}</b></div>
    <div class="kv"><span>Condition</span><b>${esc(t.cond)}</b></div>
    ${t.status === 'out'
      ? `<div class="kv"><span>Held by</span><b>${esc(t.holder)}</b></div>
         <div class="kv"><span>Taken out</span><b>${fmtDT(t.outAt)}</b></div>
         <div class="kv"><span>Due back</span>
           <b class="mono" style="color:${daysTo(t.dueAt) < 0 ? 'var(--out)' : 'inherit'}">${fmtD(t.dueAt)}</b></div>`
      : ''}
    <div class="kv"><span>Warranty</span><b>${warPill(warState(t))}</b></div>
    ${t.war ? `<div class="kv"><span>Covered until</span><b class="mono">${fmtD(warUntil(t))}</b></div>` : ''}
    <div class="kv"><span>Calibration</span><b>${calPill(calState(t))}</b></div>
    ${t.calInt
      ? `<div class="kv"><span>Interval</span><b>${t.calInt} months</b></div>
         <div class="kv"><span>Last certified</span><b class="mono">${fmtD(t.calLast)}</b></div>
         <div class="kv"><span>Next due</span><b class="mono">${fmtD(t.calNext)}</b></div>
         <div class="kv"><span>Certificate</span><b class="mono">${esc(t.cert || '—')}</b></div>`
      : ''}
    ${t.notes ? `<div style="margin-top:12px;font-size:12.5px;color:var(--ink2)">${esc(t.notes)}</div>` : ''}
  `, `
    <button class="btn" onclick="closeModal()">Close</button>
    ${can('checkout') && t.status === 'in' ? `<button class="btn pri" onclick="checkoutModal('${id}')">Check out</button>` : ''}
    ${can('checkout') && t.status === 'out' ? `<button class="btn pri" onclick="checkinModal('${id}')">Check in</button>` : ''}
  `);
}

/* ---------- tool editor ---------- */

/**
 * Add or edit a tool
 */
function toolModal(id) {
  if (!can('edit')) return toast('Your role cannot edit tools', 'bad');

  const t = id ? toolById(id) : {
    code: 'TL-' + String(S.tools.length + 1).padStart(3, '0'),
    name: '', cat: 'Test & Measure',
    site: VIEW.site === 'all' ? S.sites[0].id : VIEW.site,
    status: 'in', holder: '',
    calInt: 12, calLast: iso(today()), cert: '', cond: 'Good', notes: '',
    war: 24, warFrom: iso(today()), photo: ''
  };

  const cats = ['Test & Measure', 'Mechanical', 'Safety', 'Comms', 'Lifting', 'Other'];

  openModal(id ? 'Edit tool' : 'Add tool', id ? t.code : 'New tool record', `
    ${photoField(t)}
    <div class="fld"><label>Tool name</label><input id="tfName" value="${esc(t.name)}"></div>
    <div class="f2">
      <div class="fld"><label>Asset code</label><input id="tfCode" class="mono" value="${esc(t.code)}"></div>
      <div class="fld">
        <label>Category</label>
        <select id="tfCat">${cats.map((c) => `<option ${t.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="f2">
      <div class="fld">
        <label>Home site</label>
        <select id="tfSite">
          ${S.sites.map((s) => `<option value="${s.id}" ${t.site === s.id ? 'selected' : ''}>${esc(s.code)} — ${esc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="fld">
        <label>Condition</label>
        <select id="tfCond">
          ${['Good', 'Fair', 'Needs repair'].map((c) => `<option ${t.cond === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="f2">
      <div class="fld">
        <label>Calibration interval (months)</label>
        <input id="tfInt" type="number" value="${t.calInt}">
        <div class="hlp">0 = calibration not required</div>
      </div>
      <div class="fld"><label>Last calibrated</label><input id="tfLast" type="date" value="${t.calLast || ''}"></div>
    </div>
    <div class="fld"><label>Certificate number</label><input id="tfCert" class="mono" value="${esc(t.cert)}"></div>
    <div class="f2">
      <div class="fld"><label>Warranty (months)</label><input id="tfWar" type="number" value="${t.war || 0}"></div>
      <div class="fld"><label>Warranty starts</label><input id="tfWarFrom" type="date" value="${t.warFrom || ''}"></div>
    </div>
    <div class="fld"><label>Notes</label><textarea id="tfNotes">${esc(t.notes)}</textarea></div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="saveTool('${id || ''}')">${id ? 'Save changes' : 'Add tool'}</button>
  `);
}

/**
 * Save the tool editor
 */
function saveTool(id) {
  const g = (k) => $('#tf' + k).value.trim();

  if (!g('Name')) return toast('Tool name is required', 'bad');

  const int = Number($('#tfInt').value) || 0;
  const last = $('#tfLast').value || null;

  const base = {
    name: g('Name'), code: g('Code'), cat: g('Cat'), site: g('Site'), cond: g('Cond'),
    calInt: int,
    calLast: int ? last : null,
    calNext: int && last ? addD(int * 30, last) : null,
    cert: g('Cert'), notes: g('Notes'),
    war: Number($('#tfWar').value) || 0,
    warFrom: $('#tfWarFrom').value || null
  };

  let phDirty = false;

  if (id) {
    const obj = toolById(id);
    Object.assign(obj, base);
    phDirty = commitPhoto(obj);
    logIt('edit', `Updated tool ${base.name} (${base.code})`, base.site);
  } else {
    const obj = Object.assign({ id: uid('t'), status: 'in', holder: '', outAt: null, dueAt: null, photo: '' }, base);
    phDirty = commitPhoto(obj);
    S.tools.push(obj);
    logIt('add', `Added tool ${base.name} (${base.code})`, base.site);
  }

  saveState();
  if (phDirty) savePhotos();

  closeModal();
  buildNav();
  render();
  toast(id ? 'Tool updated' : 'Tool added', 'good');
}

/**
 * Confirm tool deletion
 */
function delTool(id) {
  const t = toolById(id);

  openModal('Delete tool', t.code, `
    <p style="font-size:13.5px;margin:0">
      Remove <b>${esc(t.name)}</b> from the register? Its calibration record goes with it.
    </p>
  `, `
    <button class="btn" onclick="closeModal()">Keep it</button>
    <button class="btn dgr" onclick="doDelTool('${id}')">Delete tool</button>
  `);
}

/**
 * Delete a tool and its device photo
 */
function doDelTool(id) {
  const t = toolById(id);

  if (t.photo && !/^https?:/i.test(t.photo)) delete PH[t.photo];
  S.tools = S.tools.filter((x) => x.id !== id);
  savePhotos();

  logIt('del', `Deleted tool ${t.name} (${t.code})`, t.site);

  saveState();
  closeModal();
  buildNav();
  render();
  toast('Tool deleted', 'good');
}

/* ---------- tool movements ---------- */

/**
 * Book a tool out to a person
 */
function checkoutModal(id) {
  if (!can('checkout')) return toast('Your role cannot book tools out', 'bad');

  const avail = S.tools.filter((t) => inSite(t) && t.status === 'in');
  if (!avail.length) return toast('No tools available at this site', 'bad');

  const pick = id || avail[0].id;
  const self = VIEW.user.role === 'tech';
  const presets = [['End of today', 0], ['3 days', 3], ['1 week', 7], ['2 weeks', 14]];

  openModal('Check out tool', 'Book a tool out to a person', `
    <div class="fld">
      <label>Tool</label>
      <select id="coTool" onchange="coSync()">
        ${avail.map((t) => `<option value="${t.id}" ${pick === t.id ? 'selected' : ''}>${esc(t.code)} — ${esc(t.name)} (${esc(t.site)})</option>`).join('')}
      </select>
      <div class="hlp" id="coHint"></div>
    </div>
    <div class="fld">
      <label>Issued to</label>
      <input id="coWho" value="${esc(VIEW.user.name)}" ${self ? 'readonly' : ''}>
      ${self ? '<div class="hlp">Technicians book tools out under their own name.</div>' : ''}
    </div>
    <div class="fld">
      <label>Return by</label>
      <div class="pick" style="margin-bottom:8px">
        ${presets.map(([l, d], i) =>
          `<button type="button" class="${i === 2 ? 'on' : ''}" onclick="coDue(this,${d})">${l}</button>`
        ).join('')}
      </div>
      <input id="coDue" type="date" value="${addD(7)}">
    </div>
    <div class="fld">
      <label>Purpose</label>
      <input id="coWhy" placeholder="e.g. Bavet quarterly IR scan">
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="doCheckout()">Check out</button>
  `);

  coSync();
}

/**
 * Apply a return-by preset
 */
function coDue(btn, d) {
  $$('#modal .pick button').forEach((b) => b.classList.remove('on'));
  btn.classList.add('on');
  $('#coDue').value = addD(d);
}

/**
 * Warn about calibration state on the selected tool
 */
function coSync() {
  const t = toolById($('#coTool').value);
  const st = calState(t);

  $('#coHint').innerHTML =
    st === 'exp'
      ? `<b style="color:var(--out)">Calibration expired ${fmtD(t.calNext)} — this tool should not be used for verification work.</b>`
      : st === 'due'
        ? `<b style="color:var(--low)">Calibration due ${fmtD(t.calNext)}.</b>`
        : t.calInt
          ? `Calibration valid to ${fmtD(t.calNext)}.`
          : 'No calibration required.';
}

/**
 * Commit a checkout
 */
function doCheckout() {
  const t = toolById($('#coTool').value);
  const who = $('#coWho').value.trim();
  const due = $('#coDue').value;
  const why = $('#coWhy').value.trim();

  if (!who) return toast('Enter who is taking the tool', 'bad');
  if (!due) return toast('Set a return date', 'bad');

  t.status = 'out';
  t.holder = who;
  t.outAt = Date.now();
  t.dueAt = due;

  logIt('checkout',
    `Checked out ${t.name} (${t.code}) to ${who}, due ${fmtD(due)}${why ? ' — ' + why : ''}`,
    t.site, { tool: t.id });

  saveState();
  closeModal();
  buildNav();
  render();
  toast(`${t.code} booked out to ${who}`, 'good');
}

/**
 * Return a tool to the store
 */
function checkinModal(id) {
  if (!can('checkout')) return toast('Your role cannot check tools in', 'bad');

  const out = S.tools.filter((t) => inSite(t) && t.status === 'out');
  if (!out.length) return toast('No tools are currently out', 'bad');

  const pick = id || out[0].id;

  openModal('Check in tool', 'Return a tool to the store', `
    <div class="fld">
      <label>Tool</label>
      <select id="ciTool">
        ${out.map((t) => `<option value="${t.id}" ${pick === t.id ? 'selected' : ''}>
          ${esc(t.code)} — ${esc(t.name)} · ${esc(t.holder)}${daysTo(t.dueAt) < 0 ? ' (overdue)' : ''}
        </option>`).join('')}
      </select>
    </div>
    <div class="fld">
      <label>Condition on return</label>
      <div class="pick">
        ${['Good', 'Fair', 'Needs repair'].map((c, i) =>
          `<button type="button" class="${i === 0 ? 'on' : ''}" data-cond="${c}" onclick="pickOne(this)">${c}</button>`
        ).join('')}
      </div>
    </div>
    <div class="fld">
      <label>Note</label>
      <textarea id="ciNote" placeholder="Damage, missing accessories, anything the next user should know"></textarea>
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="doCheckin()">Check in</button>
  `);
}

/**
 * Commit a check-in - a tool returned as "Needs repair" goes straight to service
 */
function doCheckin() {
  const t = toolById($('#ciTool').value);
  const picked = $('#modal .pick button.on');
  const cond = picked ? picked.dataset.cond : 'Good';
  const note = $('#ciNote').value.trim();
  const late = t.dueAt && daysTo(t.dueAt) < 0 ? ` (${Math.abs(daysTo(t.dueAt))} days late)` : '';
  const who = t.holder;

  t.status = cond === 'Needs repair' ? 'maint' : 'in';
  t.cond = cond;
  t.holder = '';
  t.outAt = null;
  t.dueAt = null;
  if (note) t.notes = note;

  logIt('checkin',
    `Checked in ${t.name} (${t.code}) from ${who}${late} — condition ${cond}${note ? ': ' + note : ''}`,
    t.site, { tool: t.id });

  saveState();
  closeModal();
  buildNav();
  render();
  toast(cond === 'Needs repair' ? `${t.code} received and flagged for service` : `${t.code} back in store`, 'good');
}

/**
 * Send a tool for service, or bring it back
 */
function svcToggle(id) {
  const t = toolById(id);
  if (t.status === 'out') return toast('Check the tool in first', 'bad');

  t.status = t.status === 'maint' ? 'in' : 'maint';
  logIt('edit',
    `${t.name} (${t.code}) ${t.status === 'maint' ? 'sent for service' : 'returned to service'}`,
    t.site);

  saveState();
  buildNav();
  render();
  toast(t.status === 'maint' ? 'Flagged for service' : 'Back in service', 'good');
}
