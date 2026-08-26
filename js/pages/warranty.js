/**
 * js/pages/warranty.js - Supplier warranty register for parts and tools
 */

/**
 * Render the warranty page
 */
function renderWarranty() {
  const W = warItems();
  const c = {
    all: W.length,
    ok: W.filter((x) => x.st === 'ok').length,
    soon: W.filter((x) => x.st === 'soon').length,
    exp: W.filter((x) => x.st === 'exp').length,
    none: W.filter((x) => x.st === 'none').length
  };

  const covered = W.filter((x) => x.st === 'ok' || x.st === 'soon');
  const coveredVal = covered.reduce((a, x) => a + x.val, 0);
  const atRisk = W.filter((x) => x.st === 'exp').reduce((a, x) => a + x.val, 0);
  const tracked = c.all - c.none;

  const tabs = [
    ['all', 'All'], ['exp', 'Expired'], ['soon', 'Expiring'],
    ['ok', 'Under warranty'], ['none', 'Not covered']
  ];

  $('#page').innerHTML = `
    <div class="kpis">
      <div class="kpi ok">
        <div class="kpi-l">Under warranty</div>
        <div class="kpi-v">${c.ok}</div>
        <div class="kpi-d">${money(coveredVal).replace('.00', '')} of stock covered</div>
      </div>
      <div class="kpi low">
        <div class="kpi-l">Expiring in 60 days</div>
        <div class="kpi-v">${c.soon}</div>
        <div class="kpi-d">Claim now or lose cover</div>
      </div>
      <div class="kpi out">
        <div class="kpi-l">Expired</div>
        <div class="kpi-v">${c.exp}</div>
        <div class="kpi-d">${money(atRisk).replace('.00', '')} no longer covered</div>
      </div>
      <div class="kpi br">
        <div class="kpi-l">Coverage</div>
        <div class="kpi-v">${tracked ? Math.round(covered.length / tracked * 100) : 0}%</div>
        <div class="kpi-d">${tracked} items tracked · ${c.none} not covered</div>
      </div>
    </div>

    <div class="tabs">
      ${tabs.map(([k, l]) =>
        `<button data-tab="${k}" class="${VIEW.tab === k ? 'on' : ''}">${l} ${c[k] ? `(${c[k]})` : ''}</button>`
      ).join('')}
    </div>

    <div class="tools">
      <div class="srch">
        <input id="q" placeholder="Search item, SKU or supplier…" value="${esc(VIEW.q)}">
      </div>
      <select class="sel" data-filter="cat">
        <option value="all" ${VIEW.cat === 'all' ? 'selected' : ''}>Parts and tools</option>
        <option value="part" ${VIEW.cat === 'part' ? 'selected' : ''}>Parts only</option>
        <option value="tool" ${VIEW.cat === 'tool' ? 'selected' : ''}>Tools only</option>
      </select>
    </div>
    <div class="card"><div class="card-b flush" id="listHost">${warList()}</div></div>
  `;
}

/**
 * Warranty list, expired first then soonest to expire
 */
function warList() {
  const q = VIEW.q.toLowerCase();

  const L = warItems()
    .filter((x) => VIEW.tab === 'all' || x.st === VIEW.tab)
    .filter((x) => VIEW.cat === 'all' || x.kind === VIEW.cat)
    .filter((x) => !q || (x.name + ' ' + x.code + ' ' + (x.o.sup || '')).toLowerCase().includes(q))
    .sort((a, b) => {
      const r = { exp: 0, soon: 1, ok: 2, none: 3 };
      return r[a.st] - r[b.st] || (a.until && b.until ? new Date(a.until) - new Date(b.until) : 0);
    });

  if (!L.length) return empty('▣', 'Nothing here', 'No items in this warranty status.');

  const countdown = (x) => {
    if (!x.until) return '<span style="color:var(--ink3)">—</span>';
    const d = daysTo(x.until);
    if (d < 0) return `<b style="color:var(--out)">${Math.abs(d)} days ago</b>`;
    if (d <= 60) return `<b style="color:var(--low)">in ${d} days</b>`;
    return `<span style="color:var(--ink2)">in ${Math.round(d / 30)} months</span>`;
  };

  const act = (x) => can('edit')
    ? `<button class="btn sm" onclick="${x.kind === 'part' ? `partModal('${x.o.id}')` : `toolModal('${x.o.id}')`}">Edit</button>`
    : '';

  return `
    <table class="tbl">
      <thead>
        <tr>
          <th>Item</th><th>Type</th><th>Site</th><th>Supplier</th>
          <th>Term</th><th>Started</th><th>Expires</th><th>Countdown</th><th>Status</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${L.map((x) => `
          <tr>
            <td>
              <div class="pname">${esc(x.name)}</div>
              <div class="psku">${esc(x.code)} · ${esc(x.sub)}</div>
            </td>
            <td><span class="pill ${x.kind === 'part' ? 'br' : 'mute'}">${x.kind}</span></td>
            <td class="mono" style="font-size:12px">${esc(x.o.site)}</td>
            <td style="color:var(--ink2)">${esc(x.o.sup || '—')}</td>
            <td class="mono" style="font-size:12px">${x.o.war ? x.o.war + ' mo' : '—'}</td>
            <td class="mono" style="font-size:12px">${fmtD(x.o.warFrom)}</td>
            <td class="mono" style="font-size:12px"><b>${x.until ? fmtD(x.until) : '—'}</b></td>
            <td style="font-size:12.5px">${countdown(x)}</td>
            <td>${warPill(x.st)}</td>
            <td style="text-align:right">${act(x)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="rows">
      ${L.map((x) => `
        <div class="row">
          <div class="row-m">
            <div style="display:flex;gap:8px;align-items:flex-start">
              <div style="flex:1;min-width:0">
                <div class="pname">${esc(x.name)}</div>
                <div class="psku">${esc(x.code)} · ${esc(x.o.site)} · ${esc(x.o.sup || x.sub)}</div>
              </div>
              ${warPill(x.st)}
            </div>
            ${x.until
              ? `<div style="margin-top:7px;font-size:12.5px">
                   Expires <b class="mono">${fmtD(x.until)}</b> — ${countdown(x)}
                 </div>
                 <div style="font-size:12px;color:var(--ink3);margin-top:2px">
                   ${x.o.war} month term from ${fmtD(x.o.warFrom)}
                 </div>`
              : '<div style="margin-top:7px;font-size:12.5px;color:var(--ink3)">No supplier warranty recorded</div>'}
            ${act(x) ? `<div class="row-x">${act(x)}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
