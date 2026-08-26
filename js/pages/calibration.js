/**
 * js/pages/calibration.js - Instrument calibration register
 */

/**
 * Render the calibration page
 */
function renderCalibration() {
  const T = S.tools.filter((t) => inSite(t) && t.calInt > 0);
  const c = {
    all: T.length,
    exp: T.filter((t) => calState(t) === 'exp').length,
    due: T.filter((t) => calState(t) === 'due').length,
    ok: T.filter((t) => calState(t) === 'ok').length
  };

  const tabs = [['all', 'All'], ['exp', 'Expired'], ['due', 'Due soon'], ['ok', 'Valid']];

  $('#page').innerHTML = `
    <div class="kpis">
      <div class="kpi out">
        <div class="kpi-l">Expired</div>
        <div class="kpi-v">${c.exp}</div>
        <div class="kpi-d">Do not use until re-certified</div>
      </div>
      <div class="kpi low">
        <div class="kpi-l">Due within 30 days</div>
        <div class="kpi-v">${c.due}</div>
        <div class="kpi-d">Book the lab slot now</div>
      </div>
      <div class="kpi ok">
        <div class="kpi-l">Valid</div>
        <div class="kpi-v">${c.ok}</div>
        <div class="kpi-d">of ${c.all} instruments tracked</div>
      </div>
      <div class="kpi br">
        <div class="kpi-l">Compliance</div>
        <div class="kpi-v">${c.all ? Math.round(c.ok / c.all * 100) : 100}%</div>
        <div class="kpi-d">${VIEW.site === 'all' ? 'All sites' : siteName(VIEW.site)}</div>
      </div>
    </div>

    <div class="tabs">
      ${tabs.map(([k, l]) =>
        `<button data-tab="${k}" class="${VIEW.tab === k ? 'on' : ''}">${l} ${c[k] ? `(${c[k]})` : ''}</button>`
      ).join('')}
    </div>

    <div class="tools">
      <div class="srch">
        <input id="q" placeholder="Search instrument or certificate…" value="${esc(VIEW.q)}">
      </div>
    </div>
    <div class="card"><div class="card-b flush" id="listHost">${calList()}</div></div>
  `;
}

/**
 * Calibration list, soonest due first
 */
function calList() {
  const q = VIEW.q.toLowerCase();

  const L = S.tools
    .filter((t) => inSite(t) && t.calInt > 0)
    .filter((t) => VIEW.tab === 'all' || calState(t) === VIEW.tab)
    .filter((t) => !q || (t.name + ' ' + t.code + ' ' + t.cert).toLowerCase().includes(q))
    .sort((a, b) => new Date(a.calNext) - new Date(b.calNext));

  if (!L.length) return empty('◎', 'Nothing here', 'No instruments in this status.');

  const countdown = (t) => {
    const d = daysTo(t.calNext);
    if (d < 0) return `<b style="color:var(--out)">${Math.abs(d)} days overdue</b>`;
    if (d <= 30) return `<b style="color:var(--low)">in ${d} days</b>`;
    return `<span style="color:var(--ink2)">in ${d} days</span>`;
  };

  const act = (t) => can('cal')
    ? `<button class="btn sm pri" onclick="calModal('${t.id}')">Record calibration</button>`
    : '';

  return `
    <table class="tbl">
      <thead>
        <tr>
          <th>Instrument</th><th>Site</th><th>Certificate</th><th>Interval</th>
          <th>Last</th><th>Next due</th><th>Countdown</th><th>Status</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${L.map((t) => `
          <tr>
            <td>
              <div class="pname">${esc(t.name)}</div>
              <div class="psku">${esc(t.code)}</div>
            </td>
            <td class="mono" style="font-size:12px">${esc(t.site)}</td>
            <td class="mono" style="font-size:12px">${esc(t.cert || '—')}</td>
            <td class="mono" style="font-size:12px">${t.calInt} mo</td>
            <td class="mono" style="font-size:12px">${fmtD(t.calLast)}</td>
            <td class="mono" style="font-size:12px"><b>${fmtD(t.calNext)}</b></td>
            <td style="font-size:12.5px">${countdown(t)}</td>
            <td>${calPill(calState(t))}</td>
            <td style="text-align:right">${act(t)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="rows">
      ${L.map((t) => `
        <div class="row">
          <div class="row-m">
            <div style="display:flex;gap:8px;align-items:flex-start">
              <div style="flex:1;min-width:0">
                <div class="pname">${esc(t.name)}</div>
                <div class="psku">${esc(t.code)} · ${esc(t.site)} · cert ${esc(t.cert || '—')}</div>
              </div>
              ${calPill(calState(t))}
            </div>
            <div style="margin-top:7px;font-size:12.5px">
              Next due <b class="mono">${fmtD(t.calNext)}</b> — ${countdown(t)}
            </div>
            <div style="font-size:12px;color:var(--ink3);margin-top:2px">
              Every ${t.calInt} months · last ${fmtD(t.calLast)}
            </div>
            ${act(t) ? `<div class="row-x">${act(t)}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Record a calibration certificate
 */
function calModal(id) {
  if (!can('cal')) return toast('Your role cannot record calibration', 'bad');

  const t = toolById(id);

  openModal('Record calibration', `${t.name} · ${t.code}`, `
    <div class="fld">
      <label>Date calibrated</label>
      <input id="clDate" type="date" value="${iso(today())}" onchange="clSync()">
    </div>
    <div class="fld">
      <label>Certificate number</label>
      <input id="clCert" class="mono" value="${esc(t.cert)}" placeholder="CAL-0000">
    </div>
    <div class="f2">
      <div class="fld">
        <label>Interval (months)</label>
        <input id="clInt" type="number" value="${t.calInt}" onchange="clSync()">
      </div>
      <div class="fld">
        <label>Next due</label>
        <input id="clNext" type="date" readonly>
      </div>
    </div>
    <div class="fld">
      <label>Result</label>
      <div class="pick">
        ${['Pass', 'Pass with adjustment', 'Fail'].map((c, i) =>
          `<button type="button" class="${i === 0 ? 'on' : ''}" data-res="${c}" onclick="pickOne(this)">${c}</button>`
        ).join('')}
      </div>
    </div>
    <div class="fld">
      <label>Lab / provider</label>
      <input id="clLab" placeholder="e.g. NMC Cambodia">
    </div>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn pri" onclick="doCal('${id}')">Save certificate</button>
  `);

  clSync();
}

/**
 * Recalculate the next-due date from the date and interval
 */
function clSync() {
  const d = $('#clDate').value;
  const i = Number($('#clInt').value) || 0;
  $('#clNext').value = d && i ? addD(i * 30, d) : '';
}

/**
 * Commit a calibration record - a failure sends the tool for service
 */
function doCal(id) {
  const t = toolById(id);
  const d = $('#clDate').value;
  const i = Number($('#clInt').value) || 0;
  const cert = $('#clCert').value.trim();
  const picked = $('#modal .pick button.on');
  const res = picked ? picked.dataset.res : 'Pass';
  const lab = $('#clLab').value.trim();

  if (!d) return toast('Set the calibration date', 'bad');

  t.calLast = d;
  t.calInt = i;
  t.calNext = i ? addD(i * 30, d) : null;
  t.cert = cert;
  if (res === 'Fail') t.status = 'maint';

  logIt('cal',
    `Calibration ${res.toLowerCase()} for ${t.name} (${t.code})` +
    `${cert ? ' cert ' + cert : ''}${lab ? ' at ' + lab : ''}` +
    `${t.calNext ? ', next due ' + fmtD(t.calNext) : ''}`,
    t.site, { tool: t.id });

  saveState();
  closeModal();
  buildNav();
  render();
  toast(res === 'Fail' ? 'Recorded as failed — tool flagged for service' : 'Calibration recorded', 'good');
}
