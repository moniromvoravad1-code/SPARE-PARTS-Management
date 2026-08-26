/**
 * js/pages/admin.js - Settings: branding, sites, accounts, photos, data and sync
 */

/**
 * Render the settings page
 */
function renderAdmin() {
  const admin = can('admin');

  const photoStats = () => {
    const b = photoBytes(PH);
    const pct = Math.min(100, b / PH_BUDGET * 100);
    const withPh = S.parts.filter((p) => p.photo).length + S.tools.filter((t) => t.photo).length;
    const linked = S.parts.filter((p) => /^https?:/i.test(p.photo || '')).length +
      S.tools.filter((t) => /^https?:/i.test(t.photo || '')).length;
    const n = Object.keys(PH).length;

    return `
      <div style="display:flex;justify-content:space-between;font-size:12.5px">
        <b>${n} photo${n === 1 ? '' : 's'} on device</b>
        <span class="mono" style="color:var(--ink2)">
          ${(b / 1024 / 1024).toFixed(2)} MB of ${(PH_BUDGET / 1024 / 1024).toFixed(1)} MB</span>
      </div>
      <div class="bar-use"><i class="${pct > 90 ? 'full' : pct > 70 ? 'warn' : ''}" style="width:${pct}%"></i></div>
      <div style="font-size:11.5px;color:var(--ink3)">
        ${withPh} of ${S.parts.length + S.tools.length} items have a photo ·
        ${linked} use an external link (no device storage)
      </div>
    `;
  };

  $('#page').innerHTML = `
    <div class="grid2">
      <div class="card">
        <div class="card-h">
          <div>
            <div class="card-t">Branding</div>
            <div class="card-s">Shows on the sign-in screen and sidebar</div>
          </div>
        </div>
        <div class="card-b">
          <div class="fld"><label>App name</label><input id="cfgName" value="${esc(S.cfg.appName)}"></div>
          <div class="fld">
            <label>Logo</label>
            <input id="cfgLogo" type="file" accept="image/*">
            <div class="hlp">Square image works best. Stored on this device only.</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn pri" onclick="saveBrand()">Save branding</button>
            ${S.cfg.logo ? '<button class="btn" onclick="clearLogo()">Remove logo</button>' : ''}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h">
          <div>
            <div class="card-t">Google Sheets sync</div>
            <div class="card-s">${S.cfg.sheetUrl ? 'Connected' : 'Not connected'}</div>
          </div>
        </div>
        <div class="card-b">
          <div class="fld">
            <label>Apps Script web app URL</label>
            <input id="cfgUrl" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(S.cfg.sheetUrl)}">
            <div class="hlp">Deploy the companion Apps Script as a web app, then paste the /exec URL here.</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn pri" onclick="saveUrl()">Save URL</button>
            <button class="btn" onclick="syncPush()">Push to Sheets</button>
            <button class="btn" onclick="syncPull()">Pull from Sheets</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-h">
        <div>
          <div class="card-t">Sites</div>
          <div class="card-s">${S.sites.length} locations</div>
        </div>
        ${admin ? '<div class="r"><button class="btn sm pri" onclick="siteModal()">＋ Add site</button></div>' : ''}
      </div>
      <div class="card-b flush">
        ${S.sites.map((s) => {
          const np = S.parts.filter((p) => p.site === s.id).length;
          const nt = S.tools.filter((t) => t.site === s.id).length;
          return `
            <div class="al">
              <div class="al-i br">${esc(s.code)}</div>
              <div style="min-width:0">
                <div class="al-t">${esc(s.name)}</div>
                <div class="al-s">${np} parts · ${nt} tools</div>
              </div>
              ${admin ? `<div class="al-r"><button class="btn sm" onclick="siteModal('${s.id}')">Edit</button></div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>

    ${admin
      ? `<div class="card">
          <div class="card-h">
            <div>
              <div class="card-t">Accounts</div>
              <div class="card-s">Role decides what each person can change</div>
            </div>
            <div class="r"><button class="btn sm pri" onclick="userModal()">＋ Add user</button></div>
          </div>
          <div class="card-b flush">
            ${S.users.map((u) => `
              <div class="al">
                <div class="al-i br">${esc(u.name.split(' ').map((x) => x[0]).join('').slice(0, 2))}</div>
                <div style="min-width:0">
                  <div class="al-t">${esc(u.name)}</div>
                  <div class="al-s mono">
                    ${esc(u.u)} · ${can('creds') ? esc(u.p) : '••••••••'} · ${u.site === 'all' ? 'all sites' : esc(u.site)}
                  </div>
                </div>
                <div class="al-r">
                  <span class="pill br">${ROLES[u.role].label}</span>
                  <div style="margin-top:5px"><button class="btn sm" onclick="userModal('${u.u}')">Edit</button></div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="card-b" style="border-top:1px solid var(--line);font-size:12px;color:var(--ink2)">
            <b>Manager</b> full control incl. PO approval and accounts ·
            <b>Storekeeper</b> all stock and tool operations, raises orders ·
            <b>Technician</b> issues parts and books tools out to themselves ·
            <b>Guest</b> read only.
          </div>
        </div>`
      : ''}

    <div class="card">
      <div class="card-h">
        <div>
          <div class="card-t">Photos</div>
          <div class="card-s">Stored on this device, separate from the main data</div>
        </div>
      </div>
      <div class="card-b">
        ${photoStats()}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button class="btn" onclick="prunePhotos()">Remove unused photos</button>
          ${admin ? '<button class="btn dgr" onclick="clearPhotos()">Delete all device photos</button>' : ''}
        </div>
        <div style="font-size:11.5px;color:var(--ink2);margin-top:10px">
          Uploads are resized to ${PH_MAX}px and re-encoded, so a phone photo lands around 50 KB.
          Linked images cost nothing here but need a working connection to display.
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-h">
        <div>
          <div class="card-t">Data</div>
          <div class="card-s">Everything lives in this browser until you sync</div>
        </div>
      </div>
      <div class="card-b" style="display:flex;gap:8px;flex-wrap:wrap">
        ${can('export') ? '<button class="btn" onclick="expJSON()">Export backup (JSON)</button>' : ''}
        <button class="btn" onclick="expCSV()">Export parts (CSV)</button>
        <label class="btn" style="cursor:pointer">Import backup
          <input type="file" accept="application/json" style="display:none" onchange="impJSON(this)">
        </label>
        ${admin ? '<button class="btn dgr" onclick="resetAll()">Reset to demo data</button>' : ''}
      </div>
    </div>
  `;
}

/* ---------- sites ---------- */

/**
 * Add or edit a site
 */
function siteModal(id) {
  if (!can('admin')) return toast('Manager access required', 'bad');

  const s = id ? S.sites.find((x) => x.id === id) : { id: '', name: '', code: '' };

  openModal(id ? 'Edit site' : 'Add site', id ? s.id : 'New location', `
    <div class="fld">
      <label>Site name</label>
      <input id="sfName" value="${esc(s.name)}" placeholder="Bavet BESS 20MW">
    </div>
    <div class="fld">
      <label>Short code</label>
      <input id="sfCode" class="mono" value="${esc(s.code)}" maxlength="6" placeholder="BVT" ${id ? 'disabled' : ''}>
      <div class="hlp">Used on labels and bin references. Cannot change later.</div>
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    ${id && S.sites.length > 1 ? `<button class="btn dgr" onclick="doDelSite('${id}')">Delete</button>` : ''}
    <button class="btn pri" onclick="saveSite('${id || ''}')">Save site</button>
  `);
}

/**
 * Save the site editor
 */
function saveSite(id) {
  const name = $('#sfName').value.trim();
  const code = $('#sfCode').value.trim().toUpperCase();

  if (!name) return toast('Site name is required', 'bad');

  if (id) {
    S.sites.find((x) => x.id === id).name = name;
  } else {
    if (!code) return toast('Short code is required', 'bad');
    if (S.sites.some((x) => x.id === code)) return toast('That code is already used', 'bad');
    S.sites.push({ id: code, name, code });
  }

  saveState();
  closeModal();
  buildSites();
  render();
  toast('Site saved', 'good');
}

/**
 * Delete an empty site
 */
function doDelSite(id) {
  if (S.parts.some((p) => p.site === id) || S.tools.some((t) => t.site === id)) {
    return toast('Move its parts and tools out first', 'bad');
  }

  S.sites = S.sites.filter((x) => x.id !== id);
  if (VIEW.site === id) VIEW.site = 'all';

  saveState();
  closeModal();
  buildSites();
  render();
  toast('Site deleted', 'good');
}

/* ---------- accounts ---------- */

/**
 * Add or edit an account
 */
function userModal(u) {
  if (!can('admin')) return toast('Manager access required', 'bad');

  const a = u ? S.users.find((x) => x.u === u) : { u: '', p: '', name: '', role: 'tech', site: 'all' };

  openModal(u ? 'Edit account' : 'Add account', u ? a.name : 'New user', `
    <div class="fld"><label>Full name</label><input id="ufName" value="${esc(a.name)}"></div>
    <div class="f2">
      <div class="fld">
        <label>Username</label>
        <input id="ufUser" class="mono" value="${esc(a.u)}" ${u ? 'disabled' : ''} autocapitalize="none">
      </div>
      <div class="fld"><label>Password</label><input id="ufPass" class="mono" value="${esc(a.p)}"></div>
    </div>
    <div class="f2">
      <div class="fld">
        <label>Role</label>
        <select id="ufRole">
          ${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${a.role === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="fld">
        <label>Site access</label>
        <select id="ufSite">
          <option value="all" ${a.site === 'all' ? 'selected' : ''}>All sites</option>
          ${S.sites.map((s) => `<option value="${s.id}" ${a.site === s.id ? 'selected' : ''}>${esc(s.code)} — ${esc(s.name)}</option>`).join('')}
        </select>
      </div>
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    ${u && u !== VIEW.user.u ? `<button class="btn dgr" onclick="doDelUser('${u}')">Delete</button>` : ''}
    <button class="btn pri" onclick="saveUser('${u || ''}')">Save account</button>
  `);
}

/**
 * Save the account editor
 */
function saveUser(u) {
  const name = $('#ufName').value.trim();
  const user = $('#ufUser').value.trim().toLowerCase();
  const p = $('#ufPass').value;
  const role = $('#ufRole').value;
  const site = $('#ufSite').value;

  if (!name || !p) return toast('Name and password are required', 'bad');

  if (u) {
    Object.assign(S.users.find((x) => x.u === u), { name, p, role, site });
  } else {
    if (!user) return toast('Username is required', 'bad');
    if (S.users.some((x) => x.u === user)) return toast('That username already exists', 'bad');
    S.users.push({ u: user, p, name, role, site });
  }

  saveState();
  closeModal();
  render();
  toast('Account saved', 'good');
}

/**
 * Delete an account
 */
function doDelUser(u) {
  S.users = S.users.filter((x) => x.u !== u);
  saveState();
  closeModal();
  render();
  toast('Account deleted', 'good');
}

/* ---------- branding ---------- */

/**
 * Save the app name and optional logo
 */
function saveBrand() {
  const nm = $('#cfgName').value.trim() || 'VoltGrid Store';
  const f = $('#cfgLogo').files[0];

  const done = () => {
    S.cfg.appName = nm;
    saveState();
    brand();
    render();
    toast('Branding updated', 'good');
  };

  if (f) {
    if (f.size > 600000) return toast('Logo must be under 600 KB', 'bad');
    const r = new FileReader();
    r.onload = (e) => {
      S.cfg.logo = e.target.result;
      done();
    };
    r.readAsDataURL(f);
  } else {
    done();
  }
}

/**
 * Drop the logo, keep the name
 */
function clearLogo() {
  S.cfg.logo = '';
  saveState();
  brand();
  render();
  toast('Logo removed', 'good');
}

/**
 * Save the Apps Script endpoint
 */
function saveUrl() {
  S.cfg.sheetUrl = $('#cfgUrl').value.trim();
  saveState();
  render();
  toast(S.cfg.sheetUrl ? 'Sheets URL saved' : 'Sheets URL cleared', 'good');
}

/* ---------- photo maintenance ---------- */

/**
 * Drop device photos no item points at any more
 */
function prunePhotos() {
  const used = new Set([...S.parts, ...S.tools].map((o) => o.photo).filter(Boolean));
  const dead = Object.keys(PH).filter((k) => !used.has(k));

  if (!dead.length) return toast('No unused photos to remove');

  dead.forEach((k) => delete PH[k]);
  savePhotos();
  render();
  toast(`Removed ${dead.length} unused photo${dead.length === 1 ? '' : 's'}`, 'good');
}

/**
 * Confirm wiping every stored photo
 */
function clearPhotos() {
  if (!can('admin')) return toast('Manager access required', 'bad');

  openModal('Delete all device photos', 'Linked images are not affected', `
    <p style="font-size:13.5px;margin:0">
      This removes every uploaded photo from this device
      (${Object.keys(PH).length} images, ${(photoBytes(PH) / 1024 / 1024).toFixed(2)} MB).
      Parts and tools stay, they just lose their picture. Export a backup first if you want to keep them.
    </p>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn dgr" onclick="doClearPhotos()">Delete all photos</button>
  `);
}

/**
 * Wipe stored photos and clear the pointers that used them
 */
function doClearPhotos() {
  PH = {};
  [...S.parts, ...S.tools].forEach((o) => {
    if (o.photo && !/^https?:/i.test(o.photo)) o.photo = '';
  });

  savePhotos();
  saveState();
  closeModal();
  render();
  toast('Device photos deleted', 'good');
}

/* ---------- data in / out ---------- */

/**
 * Hand a generated file to the user.
 *
 * Opened as a normal page the browser downloads it directly. Opened inside a
 * viewer that sandboxes downloads, the host save surface takes it instead.
 *
 * @returns {Promise<boolean>} true once the file has been handed over
 */
async function dl(name, text, type) {
  const host = window.claude && typeof window.claude.use === 'function'
    ? await window.claude.use('downloads')
    : null;

  if (host) {
    try {
      await host.save({ filename: name, data: text });
      return true;
    } catch (e) {
      const code = e && e.code;
      if (code === 'declined') return false;
      if (code === 'extension_not_enabled') {
        toast('This viewer cannot save that file type — export the JSON backup instead', 'bad');
        return false;
      }
      if (code === 'too_large') {
        toast('That export is too large to save here', 'bad');
        return false;
      }
      toast('Could not save the file', 'bad');
      return false;
    }
  }

  const b = new Blob([text], { type: type || 'application/json' });
  const a = document.createElement('a');

  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();

  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  return true;
}

/**
 * Export the whole store, photos included
 */
async function expJSON() {
  // A full backup carries the activity log with it, so it follows the same rule
  if (!can('export')) return toast('Manager access required', 'bad');

  const ok = await dl(
    `voltgrid-store-${iso(today())}.json`,
    JSON.stringify(Object.assign({}, S, { _photos: PH }), null, 2)
  );
  if (ok) toast('Backup downloaded', 'good');
}

/**
 * Export the parts register as CSV
 */
async function expCSV() {
  const head = [
    'SKU', 'Name', 'Category', 'Site', 'Bin', 'OnHand', 'Min', 'Unit', 'UnitCost', 'StockValue',
    'Supplier', 'LeadDays', 'Status', 'WarrantyMonths', 'WarrantyFrom', 'WarrantyUntil', 'WarrantyStatus', 'Photo'
  ];

  const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

  const rows = S.parts.map((p) => [
    p.sku, p.name, p.cat, p.site, p.bin, p.qty, p.min, p.unit, p.cost, (p.qty * p.cost).toFixed(2),
    p.sup, p.lt, stockState(p), p.war || 0, p.warFrom || '', warUntil(p) || '', warState(p),
    /^https?:/i.test(p.photo || '') ? p.photo : (p.photo ? 'on device' : '')
  ].map(q).join(','));

  const ok = await dl(`voltgrid-parts-${iso(today())}.csv`, [head.join(','), ...rows].join('\n'), 'text/csv');
  if (ok) toast('Parts CSV downloaded', 'good');
}

/**
 * Restore a backup file
 */
function impJSON(inp) {
  const f = inp.files[0];
  if (!f) return;

  const r = new FileReader();

  r.onload = (e) => {
    try {
      const d = JSON.parse(e.target.result);
      if (!d.parts || !d.tools) throw new Error('not a backup');

      if (d._photos && typeof d._photos === 'object') {
        PH = d._photos;
        savePhotos();
      }
      delete d._photos;

      S = migrate(d);
      if (!S.cfg) S.cfg = { appName: 'VoltGrid Store', logo: '', sheetUrl: '', poSeq: 1 };

      saveState();
      brand();
      buildSites();
      buildNav();
      render();
      toast('Backup restored', 'good');
    } catch (err) {
      toast('That file is not a VoltGrid backup', 'bad');
    }
    inp.value = '';
  };

  r.readAsText(f);
}

/**
 * Confirm resetting to demo data
 */
function resetAll() {
  openModal('Reset to demo data', 'This cannot be undone', `
    <p style="font-size:13.5px;margin:0">
      All parts, tools, orders and activity on this device will be replaced with the original demo set.
      Export a backup first if you want to keep anything.
    </p>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn dgr" onclick="doReset()">Reset everything</button>
  `);
}

/**
 * Reset to seed data, keeping whoever is signed in
 */
function doReset() {
  const me = VIEW.user.u;

  PH = {};
  savePhotos();

  S = seed();
  VIEW.user = S.users.find((u) => u.u === me) || S.users[0];

  saveState();
  brand();
  buildSites();
  buildNav();
  render();
  closeModal();
  toast('Reset to demo data', 'good');
}

/* ---------- Google Sheets sync ---------- */

/**
 * Update the sync indicator in the sidebar footer
 */
function setSync(t, colour) {
  const dot = $('#syncDot');
  if (!dot) return;

  dot.textContent = t;
  dot.style.color = colour || '';
}

/**
 * Push the local store up to the Apps Script endpoint
 */
async function syncPush() {
  if (!S.cfg.sheetUrl) return toast('Add the Apps Script URL first', 'bad');

  setSync('● syncing…', '#C2740D');
  toast('Pushing to Google Sheets…');

  try {
    await fetch(S.cfg.sheetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'push',
        payload: {
          parts: S.parts,
          tools: S.tools,
          pos: S.pos,
          sites: S.sites,
          log: S.log.slice(0, 200)
        }
      })
    });

    S.cfg.lastSync = Date.now();
    saveState();
    setSync('● synced ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), '#8FE3C8');
    toast('Pushed to Google Sheets', 'good');
  } catch (e) {
    setSync('● sync failed', '#FF9A92');
    toast('Could not reach the Sheets endpoint', 'bad');
  }
}

/**
 * Pull the store back down from the Apps Script endpoint
 */
async function syncPull() {
  if (!S.cfg.sheetUrl) return toast('Add the Apps Script URL first', 'bad');

  setSync('● syncing…', '#C2740D');

  try {
    const r = await fetch(S.cfg.sheetUrl + '?action=pull');
    const d = await r.json();
    if (!d || !d.parts) throw new Error('empty response');

    S.parts = d.parts;
    if (d.tools) S.tools = d.tools;
    if (d.pos) S.pos = d.pos;
    if (d.sites) S.sites = d.sites;

    S.cfg.lastSync = Date.now();
    saveState();
    buildSites();
    buildNav();
    render();

    setSync('● synced ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), '#8FE3C8');
    toast('Pulled from Google Sheets', 'good');
  } catch (e) {
    setSync('● sync failed', '#FF9A92');
    toast('Could not read from the Sheets endpoint', 'bad');
  }
}
