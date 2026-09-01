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
          <div class="fld">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input id="cfgAuto" type="checkbox" style="width:16px;height:16px;cursor:pointer"
                ${S.cfg.autoSync ? 'checked' : ''} onchange="saveAutoSync(this.checked)">
              Load from the sheet every time the app opens
            </label>
            <div class="hlp">
              The sheet becomes the source of truth — parts, tools, orders, sites and history are
              replaced on each open. Accounts always stay on this device.
              ${S.cfg.lastSync ? `Last read ${ago(S.cfg.lastSync)}.` : ''}
            </div>
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
              <div class="card-s">${S.users.length} users · permissions are set per account</div>
            </div>
            <div class="r" style="display:flex;gap:8px">
              <label class="btn sm" style="cursor:pointer">Import list
                <input type="file" accept="application/json" style="display:none" onchange="impUsers(this)">
              </label>
              <button class="btn sm pri" onclick="userModal()">＋ Add user</button>
            </div>
          </div>
          <div class="card-b flush">
            ${S.users.map((u) => `
              <div class="al">
                <div class="al-i br">${esc(u.name.split(' ').map((x) => x[0]).join('').slice(0, 2))}</div>
                <div style="min-width:0">
                  <div class="al-t">${esc(u.name)}</div>
                  <div class="al-s mono">
                    ${esc(u.u)} · ${canDo('admin', 'accounts') ? esc(u.p) : '••••••••'} · ${esc(siteSummary(u))}
                  </div>
                  <div class="al-s">${esc(permSummary(u))}</div>
                </div>
                <div class="al-r">
                  <span class="pill br">${ROLES[u.role] ? esc(ROLES[u.role].label) : esc(u.role)}</span>
                  ${u.active === 0 ? '<span class="pill out">Inactive</span>' : ''}
                  <div style="margin-top:5px"><button class="btn sm" onclick="userModal('${u.u}')">Edit</button></div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="card-b" style="border-top:1px solid var(--line);font-size:12px;color:var(--ink2)">
            ${Object.values(ROLES).map((r) => `<b>${esc(r.label)}</b> ${esc(r.blurb)}`).join(' · ')}.
            Each account starts from its role template and can then be tuned on its own.
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
 * "3 of 8 modules" for the accounts list
 */
function permSummary(u) {
  const p = permsFor(u);
  const on = MODULES.filter((m) => p[m.id].view);
  return on.length === MODULES.length
    ? 'All modules'
    : on.length
      ? `${on.length} of ${MODULES.length} modules · ${on.map((m) => m.t).join(', ')}`
      : 'No modules enabled';
}

/**
 * Which warehouses an account reaches, for the accounts list
 */
function siteSummary(u) {
  const ids = siteIdsFor(u);
  return ids.length >= S.sites.length ? 'all warehouses' : ids.join(', ');
}

/**
 * Working copy of the permissions being edited, so toggles can be cancelled.
 */
let PERM_DRAFT = null;
let SITE_DRAFT = [];

/**
 * The permission matrix: one row per module, one column per core action.
 */
function permMatrixHtml() {
  return `
    <table class="permtbl">
      <thead>
        <tr>
          <th class="mod">Module</th>
          ${CORE_ACTS.map((a) => `<th>${esc(ACT_LABEL[a])}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${MODULES.map((m) => `
          <tr class="${PERM_DRAFT[m.id].view ? '' : 'off'}">
            <td class="mod"><b>${esc(m.t)}</b></td>
            ${CORE_ACTS.map((a) => {
              if (!m.acts.includes(a)) return '<td class="na">—</td>';
              const on = PERM_DRAFT[m.id][a] ? 'checked' : '';
              const dim = a !== 'view' && !PERM_DRAFT[m.id].view ? 'disabled' : '';
              return `<td><input type="checkbox" ${on} ${dim}
                onchange="permSet('${m.id}','${a}',this.checked)"></td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Module-specific operations that do not fit the matrix columns.
 */
function permOpsHtml() {
  return `
    <div class="permops">
      ${MODULES.map((m) => {
        const extra = m.acts.filter((a) => !CORE_ACTS.includes(a));
        if (!extra.length) return '';
        return `
          <div class="grp">${esc(m.t)}</div>
          ${extra.map((a) => `
            <label>
              <input type="checkbox" ${PERM_DRAFT[m.id][a] ? 'checked' : ''}
                ${PERM_DRAFT[m.id].view ? '' : 'disabled'}
                onchange="permSet('${m.id}','${a}',this.checked)">
              ${esc(ACT_LABEL[a] || a)}
            </label>
          `).join('')}
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Flip one permission in the draft and repaint the matrix.
 * Turning a module off clears everything under it; granting any action
 * implies being able to open the module.
 */
function permSet(mod, act, on) {
  PERM_DRAFT[mod][act] = on ? 1 : 0;

  if (act === 'view' && !on) {
    Object.keys(PERM_DRAFT[mod]).forEach((k) => (PERM_DRAFT[mod][k] = 0));
  }
  if (act !== 'view' && on) PERM_DRAFT[mod].view = 1;

  const host = $('#permHost');
  if (host) host.innerHTML = permMatrixHtml();

  const ops = $('#permOps');
  if (ops) ops.innerHTML = permOpsHtml();
}

/**
 * Enable all / disable all / reset to the role template
 */
function permBulk(mode) {
  const role = $('#ufRole') ? $('#ufRole').value : 'guest';
  const tpl = ROLES[role] || ROLES.guest;

  PERM_DRAFT = mode === 'all' ? allPerms()
    : mode === 'none' ? noPerms()
    : JSON.parse(JSON.stringify(tpl.perms));

  permSet('home', 'view', !!PERM_DRAFT.home.view);

  toast(mode === 'all' ? 'Everything enabled'
    : mode === 'none' ? 'Everything disabled'
    : `Reset to the ${tpl.label} default`);
}

/**
 * Tick or clear one warehouse in the draft
 */
function siteSet(id, on) {
  SITE_DRAFT = on ? [...new Set([...SITE_DRAFT, id])] : SITE_DRAFT.filter((x) => x !== id);

  const host = $('#siteHost');
  if (host) host.innerHTML = sitePickHtml();
}

/**
 * Tick or clear every warehouse
 */
function siteSetAll(on) {
  SITE_DRAFT = on ? S.sites.map((s) => s.id) : [];

  const host = $('#siteHost');
  if (host) host.innerHTML = sitePickHtml();
}

/**
 * Warehouse assignment list
 */
function sitePickHtml() {
  const all = SITE_DRAFT.length >= S.sites.length;

  return `
    <div class="sitepick">
      <label style="grid-column:1/-1;font-weight:600">
        <input type="checkbox" ${all ? 'checked' : ''} onchange="siteSetAll(this.checked)">
        All warehouses
      </label>
      ${S.sites.map((s) => `
        <label>
          <input type="checkbox" ${SITE_DRAFT.includes(s.id) ? 'checked' : ''}
            onchange="siteSet('${s.id}',this.checked)">
          <span class="mono">${esc(s.code)}</span> ${esc(s.name)}
        </label>
      `).join('')}
    </div>
    <div class="hlp">
      ${SITE_DRAFT.length
        ? `Sees stock from ${SITE_DRAFT.length} of ${S.sites.length} warehouses.`
        : 'None ticked — the account sees every warehouse.'}
    </div>
  `;
}

/**
 * Add or edit an account, with its module permissions and warehouse access
 */
function userModal(u) {
  if (!canDo('admin', 'accounts')) return toast('Manager access required', 'bad');

  const a = u
    ? S.users.find((x) => x.u === u)
    : { u: '', p: '', name: '', role: 'tech', site: 'all', active: 1 };

  const self = !!u && u === VIEW.user.u;
  const editPerms = canDo('admin', 'perms');

  PERM_DRAFT = permsFor(a);
  SITE_DRAFT = Array.isArray(a.sites)
    ? a.sites.slice()
    : (a.site && a.site !== 'all' ? [a.site] : []);

  openModal(u ? 'Edit user' : 'Add user', u ? a.name : 'New account', `
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
        <label>Role template</label>
        <select id="ufRole">
          ${Object.entries(ROLES).map(([k, v]) =>
            `<option value="${k}" ${a.role === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}
        </select>
        <div class="hlp">Seeds the permissions below. Tune them per account afterwards.</div>
      </div>
      <div class="fld">
        <label>Status</label>
        <select id="ufActive" ${self ? 'disabled' : ''}>
          <option value="1" ${a.active === 0 ? '' : 'selected'}>Active</option>
          <option value="0" ${a.active === 0 ? 'selected' : ''}>Inactive — cannot sign in</option>
        </select>
        ${self ? '<div class="hlp">You cannot deactivate your own account.</div>' : ''}
      </div>
    </div>

    <div class="fld">
      <label>Assigned warehouses</label>
      <div id="siteHost">${sitePickHtml()}</div>
    </div>

    ${editPerms ? `
      <div class="fld">
        <label>Module permissions</label>
        <div class="permbar">
          <button type="button" class="btn sm" onclick="permBulk('all')">Enable all</button>
          <button type="button" class="btn sm" onclick="permBulk('none')">Disable all</button>
          <button type="button" class="btn sm" onclick="permBulk('role')">Reset to role default</button>
        </div>
        <div id="permHost">${permMatrixHtml()}</div>
        ${self
          ? '<div class="hlp">Settings stays enabled on your own account, so you cannot lock yourself out.</div>'
          : ''}
      </div>

      <div class="fld">
        <label>Operations</label>
        <div id="permOps">${permOpsHtml()}</div>
      </div>`
      : '<div class="hlp">Your account cannot change permissions.</div>'}
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    ${u && !self ? `<button class="btn dgr" onclick="doDelUser('${u}')">Delete</button>` : ''}
    <button class="btn pri" onclick="saveUser('${u || ''}')">Save permissions</button>
  `, true);
}

/**
 * What changed between two permission sets, so the activity log records the
 * actual grants and revokes rather than just "permissions updated".
 */
function permDiff(before, after) {
  const on = [];
  const off = [];

  MODULES.forEach((m) => {
    m.acts.forEach((a) => {
      const b = before[m.id] ? before[m.id][a] : 0;
      const c = after[m.id] ? after[m.id][a] : 0;
      if (b === c) return;
      (c ? on : off).push(`${m.t} → ${ACT_LABEL[a] || a}`);
    });
  });

  return { on, off };
}

/**
 * Save the account editor
 */
function saveUser(u) {
  if (!canDo('admin', 'accounts')) return toast('Manager access required', 'bad');

  const name = $('#ufName').value.trim();
  const user = $('#ufUser').value.trim().toLowerCase();
  const p = $('#ufPass').value;
  const role = $('#ufRole').value;
  const active = $('#ufActive') && $('#ufActive').value === '0' ? 0 : 1;
  const self = !!u && u === VIEW.user.u;

  if (!name || !p) return toast('Name and password are required', 'bad');

  const perms = canDo('admin', 'perms') ? JSON.parse(JSON.stringify(PERM_DRAFT)) : null;

  // Never let the signed-in manager revoke their own way back into Settings
  if (perms && self) {
    perms.admin.view = 1;
    perms.admin.accounts = 1;
    perms.admin.perms = 1;
  }

  const sites = SITE_DRAFT.slice();
  const siteLabel = sites.length ? sites.join(', ') : 'all warehouses';

  if (u) {
    const acc = S.users.find((x) => x.u === u);
    const before = permsFor(acc);

    Object.assign(acc, {
      name, p, role, active, sites,
      site: sites.length === 1 ? sites[0] : 'all'
    });
    if (perms) acc.perms = perms;

    const d = perms ? permDiff(before, perms) : { on: [], off: [] };
    logIt('perm',
      `Updated account ${name} (${u}) — ${siteLabel}` +
      (d.on.length ? `; enabled ${d.on.join(', ')}` : '') +
      (d.off.length ? `; disabled ${d.off.join(', ')}` : ''),
      'all', { target: u });
  } else {
    if (!user) return toast('Username is required', 'bad');
    if (S.users.some((x) => x.u === user)) return toast('That username already exists', 'bad');

    const acc = {
      u: user, p, name, role, active, sites,
      site: sites.length === 1 ? sites[0] : 'all'
    };
    if (perms) acc.perms = perms;
    S.users.push(acc);

    logIt('perm', `Created account ${name} (${user}) as ${ROLES[role].label} — ${siteLabel}`,
      'all', { target: user });
  }

  // The signed-in account may have just changed its own reach
  if (self) VIEW.user = S.users.find((x) => x.u === u);

  saveState();
  closeModal();
  buildSites();
  buildNav();
  render();
  toast('Account saved', 'good');
}

/**
 * Add a list of people from a JSON file, without touching stock or history.
 *
 * Accepts either a bare array or { "users": [...] }. Each entry needs at least
 * a username, a password and a name; position, ID card, role and site are
 * optional. Existing usernames are left exactly as they are, so importing the
 * same list twice is safe.
 */
function impUsers(inp) {
  if (!can('admin')) return toast('Manager access required', 'bad');

  const f = inp.files[0];
  if (!f) return;

  const r = new FileReader();

  r.onload = (e) => {
    inp.value = '';

    let list;
    try {
      const d = JSON.parse(e.target.result);
      list = Array.isArray(d) ? d : d.users;
      if (!Array.isArray(list)) throw new Error('no users array');
    } catch (err) {
      return toast('That file is not an account list', 'bad');
    }

    const added = [];
    const skipped = [];
    const rejected = [];

    list.forEach((a) => {
      const u = String(a.u || '').trim().toLowerCase();

      if (!u || !a.p || !a.name) return rejected.push(u || '(no username)');
      if (!ROLES[a.role]) return rejected.push(u + ' (unknown role)');
      if (String(a.p).length < 6) return rejected.push(u + ' (password too short)');
      if (S.users.some((x) => x.u === u)) return skipped.push(u);

      S.users.push({
        u,
        p: String(a.p),
        name: String(a.name),
        position: a.position ? String(a.position) : '',
        idCard: a.idCard ? String(a.idCard) : '',
        role: a.role,
        site: a.site && a.site !== 'all' && S.sites.some((s) => s.id === a.site) ? a.site : 'all'
      });
      added.push(u);
    });

    if (!added.length && !skipped.length) {
      return toast('Nothing in that file could be imported', 'bad');
    }

    if (added.length) {
      logIt('add', `Imported ${added.length} account${added.length === 1 ? '' : 's'}: ${added.join(', ')}`, 'all');
      saveState();
    }

    render();

    const parts = [`${added.length} added`];
    if (skipped.length) parts.push(`${skipped.length} already here`);
    if (rejected.length) parts.push(`${rejected.length} rejected`);
    toast(parts.join(' · '), added.length ? 'good' : null);
  };

  r.readAsText(f);
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
  const nm = $('#cfgName').value.trim() || 'SPARE PARTS MANAGEMENT SYSTEM';
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

/**
 * Turn "load from the sheet on open" on or off
 */
function saveAutoSync(on) {
  S.cfg.autoSync = !!on;
  saveState();

  if (on && !S.cfg.sheetUrl) return toast('Add the Apps Script URL first', 'bad');
  toast(on ? 'The sheet will load each time the app opens' : 'Automatic loading turned off', 'good');
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
      if (!S.cfg) S.cfg = { appName: 'SPARE PARTS MANAGEMENT SYSTEM', logo: 'assets/logo.svg', sheetUrl: '', poSeq: 1 };

      saveState();
      brand();
      buildSites();
      buildNav();
      render();
      toast('Backup restored', 'good');
    } catch (err) {
      toast('That file is not an SNT backup', 'bad');
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
 * Read the sheet and replace the local store with what it holds.
 *
 * Data only — no UI work — so this is safe to call before anyone has signed
 * in. Accounts are never touched: they live on the device, not in the sheet.
 *
 * @returns {Promise<Object>} counts of what came back
 * @throws if the endpoint is unreachable or answers with something unusable
 */
async function pullData() {
  // Give up rather than hang: an unreachable or sign-in-walled URL would
  // otherwise leave the request open indefinitely.
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 15000);

  let d;
  try {
    const r = await fetch(S.cfg.sheetUrl + '?action=pull', { signal: stop.signal });
    d = await r.json();
  } finally {
    clearTimeout(timer);
  }

  // A sheet with no Parts tab is almost always a wrong URL or a failed deploy,
  // and overwriting good local data with it would be destructive.
  if (!d || !Array.isArray(d.parts) || !d.parts.length) {
    throw new Error('the sheet returned no parts');
  }

  S.parts = d.parts;
  if (Array.isArray(d.tools)) S.tools = d.tools;
  if (Array.isArray(d.pos)) S.pos = d.pos;
  if (Array.isArray(d.sites) && d.sites.length) S.sites = d.sites;
  if (Array.isArray(d.log)) S.log = d.log;

  S.cfg.lastSync = Date.now();
  await saveState();

  return {
    parts: S.parts.length,
    tools: S.tools.length,
    pos: S.pos.length,
    sites: S.sites.length,
    log: S.log.length
  };
}

/**
 * Pull the store back down from the Apps Script endpoint, and redraw
 */
async function syncPull() {
  if (!S.cfg.sheetUrl) return toast('Add the Apps Script URL first', 'bad');

  setSync('● syncing…', '#C2740D');

  try {
    const n = await pullData();

    // Only touch the UI if someone is actually looking at it
    if (VIEW.user) {
      buildSites();
      buildNav();
      render();
    }

    setSync('● synced ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), '#8FE3C8');
    toast(`Pulled ${n.parts} parts, ${n.tools} tools, ${n.pos} orders`, 'good');
  } catch (e) {
    setSync('● sync failed', '#FF9A92');
    toast('Could not read from the Sheets endpoint', 'bad');
  }
}
