/**
 * js/pages/home.js - Overview dashboard
 */

/**
 * Render the overview page
 */
function renderHome() {
  const low = lowParts();
  const outp = low.filter((p) => stockState(p) === 'out');
  const ov = overTools();
  const cd = calDue();
  const op = openPOs();
  const toolsOut = S.tools.filter((t) => inSite(t) && t.status === 'out').length;
  const recent = S.log.filter((l) => VIEW.site === 'all' || l.site === VIEW.site);
  const parts = S.parts.filter(inSite);
  const wx = warExpiring();

  // Everything needing attention, worst first
  const alerts = [
    ...outp.map((p) => ({
      k: 'out', i: '▤', t: p.name,
      s: `${p.sku} · ${siteName(p.site)}`, r: '0 ' + p.unit, go: 'parts'
    })),
    ...ov.map((t) => ({
      k: 'out', i: '⚒', t: t.name,
      s: `${t.code} · ${t.holder}`, r: Math.abs(daysTo(t.dueAt)) + 'd late', go: 'tools'
    })),
    ...cd.filter((t) => calState(t) === 'exp').map((t) => ({
      k: 'out', i: '◎', t: t.name,
      s: `${t.code} · cert ${t.cert || '—'}`, r: 'expired', go: 'cal'
    })),
    ...low.filter((p) => stockState(p) === 'low').map((p) => ({
      k: 'low', i: '▤', t: p.name,
      s: `${p.sku} · min ${p.min}`, r: p.qty + ' ' + p.unit, go: 'parts'
    })),
    ...cd.filter((t) => calState(t) === 'due').map((t) => ({
      k: 'low', i: '◎', t: t.name,
      s: `${t.code} · due ${fmtD(t.calNext)}`, r: daysTo(t.calNext) + 'd', go: 'cal'
    })),
    ...wx.map((x) => ({
      k: 'low', i: '▣', t: x.name,
      s: `${x.code} · warranty ends ${fmtD(x.until)}`, r: daysTo(x.until) + 'd', go: 'war'
    }))
  ];

  const acts = [];
  if (can('issue')) acts.push('<button class="btn pri" onclick="issueModal()">▤ Issue parts</button>');
  if (can('checkout')) acts.push('<button class="btn" onclick="checkoutModal()">⚒ Check out tool</button>');
  if (can('receive')) acts.push('<button class="btn" onclick="receiveModal()">↓ Receive stock</button>');
  if (can('po')) acts.push('<button class="btn" onclick="poModal()">⇄ New purchase order</button>');

  const moveIcon = {
    issue: '↑', receive: '↓', adjust: '≠', checkout: '⚒', checkin: '↩',
    po: '⇄', cal: '◎', edit: '✎', add: '＋', del: '✕'
  };

  $('#page').innerHTML = `
    <div class="kpis">
      <button class="kpi br" data-go="parts">
        <div class="kpi-l">Stock value</div>
        <div class="kpi-v">${'$' + Math.round(stockValue()).toLocaleString()}</div>
        <div class="kpi-d">${parts.length} line items</div>
      </button>
      <button class="kpi ${outp.length ? 'out' : 'ok'}" data-go="parts">
        <div class="kpi-l">Below minimum</div>
        <div class="kpi-v">${low.length}</div>
        <div class="kpi-d">${outp.length} at zero stock</div>
      </button>
      <button class="kpi ${ov.length ? 'out' : 'ok'}" data-go="tools">
        <div class="kpi-l">Tools out</div>
        <div class="kpi-v">${toolsOut}</div>
        <div class="kpi-d">${ov.length} past due date</div>
      </button>
      <button class="kpi ${cd.length ? 'low' : 'ok'}" data-go="cal">
        <div class="kpi-l">Calibration due</div>
        <div class="kpi-v">${cd.length}</div>
        <div class="kpi-d">${cd.filter((t) => calState(t) === 'exp').length} already expired</div>
      </button>
      <button class="kpi ord" data-go="po">
        <div class="kpi-l">Open orders</div>
        <div class="kpi-v">${op.length}</div>
        <div class="kpi-d">${money(op.reduce((a, o) => a + poTotal(o), 0))} committed</div>
      </button>
      <button class="kpi ${wx.length ? 'low' : 'ok'}" data-go="war">
        <div class="kpi-l">Warranty expiring</div>
        <div class="kpi-v">${wx.length}</div>
        <div class="kpi-d">${warExpired().length} already expired</div>
      </button>
    </div>

    ${acts.length
      ? `<div class="card"><div class="card-b" style="display:flex;gap:8px;flex-wrap:wrap">${acts.join('')}</div></div>`
      : ''}

    ${useBlock()}

    <div class="grid2">
      <div class="card">
        <div class="card-h">
          <div>
            <div class="card-t">Needs attention</div>
            <div class="card-s">${alerts.length ? alerts.length + ' open items' : 'Everything is within limits'}</div>
          </div>
        </div>
        <div class="card-b flush">
          ${alerts.length
            ? alerts.slice(0, ROWCAP).map((a) => `
              <button class="al" data-go="${a.go}">
                <div class="al-i ${a.k}">${a.i}</div>
                <div style="min-width:0">
                  <div class="al-t">${esc(a.t)}</div>
                  <div class="al-s">${esc(a.s)}</div>
                </div>
                <div class="al-r"><span class="pill ${a.k}">${esc(a.r)}</span></div>
              </button>
            `).join('') + moreRow(alerts.length, 'open items', 'alertsModal()')
            : empty('✓', 'All clear', 'No low stock, overdue tools or expired certificates.')}
        </div>
      </div>

      <div class="card">
        <div class="card-h">
          <div>
            <div class="card-t">Recent movements</div>
            <div class="card-s">Last stock and tool transactions</div>
          </div>
        </div>
        <div class="card-b flush">
          ${recent.length
            ? recent.slice(0, ROWCAP).map((l) => `
              <div class="al">
                <div class="al-i br">${moveIcon[l.type] || '•'}</div>
                <div style="min-width:0">
                  <div class="al-t" style="font-weight:500">${esc(l.txt)}</div>
                  <div class="al-s">${esc(l.by)} · ${ago(l.ts)}</div>
                </div>
              </div>
            `).join('') + (canSee('log') ? moreRow(recent.length, 'movements', "goLog('all')") : '')
            : empty('≡', 'No activity yet', '')}
        </div>
      </div>
    </div>

    ${catBlock()}
  `;
}

/* ---------- stock by category ---------- */

/**
 * Category breakdown card - share of value or line count, with the at-risk portion
 */
function catBlock() {
  const parts = S.parts.filter(inSite);
  const byVal = VIEW.catMode !== 'items';

  const cats = [...new Set(parts.map((p) => p.cat))]
    .map((c) => {
      const g = parts.filter((p) => p.cat === c);
      const bad = g.filter((p) => stockState(p) !== 'ok');
      return {
        c,
        items: g.length,
        qty: g.reduce((a, p) => a + p.qty, 0),
        val: g.reduce((a, p) => a + p.qty * p.cost, 0),
        riskVal: bad.reduce((a, p) => a + p.qty * p.cost, 0),
        low: g.filter((p) => stockState(p) === 'low').length,
        out: g.filter((p) => stockState(p) === 'out').length
      };
    })
    .sort((a, b) => (byVal ? b.val - a.val : b.items - a.items));

  const totVal = cats.reduce((a, x) => a + x.val, 0);
  const totItems = cats.reduce((a, x) => a + x.items, 0);
  const tot = byVal ? totVal : totItems;

  return `
    <div class="card">
      <div class="card-h">
        <div>
          <div class="card-t">Stock by category</div>
          <div class="card-s">
            ${VIEW.site === 'all' ? 'All warehouses' : siteName(VIEW.site)} ·
            ${money(totVal).replace('.00', '')} across ${totItems} line items
          </div>
        </div>
        <div class="r">
          <div class="seg">
            <button class="${byVal ? 'on' : ''}" onclick="setCatMode('value')">By value</button>
            <button class="${byVal ? '' : 'on'}" onclick="setCatMode('items')">By count</button>
          </div>
        </div>
      </div>
      <div class="card-b flush">
        ${cats.length
          ? cats.map((x) => {
              const mine = byVal ? x.val : x.items;
              const risk = byVal ? x.riskVal : x.low + x.out;
              const share = tot ? mine / tot * 100 : 0;
              const riskShare = mine ? risk / mine * 100 : 0;

              return `
                <button class="catrow" onclick="goCat('${esc(x.c)}')">
                  <span class="cat-n">
                    <b>${esc(x.c)}</b>
                    <span>${x.items} item${x.items > 1 ? 's' : ''} · ${x.qty} units</span>
                  </span>
                  <span class="cat-b">
                    <span class="stack" title="${money(x.val)} total, ${money(x.riskVal)} below minimum">
                      <i class="g" style="width:${share * (100 - riskShare) / 100}%"></i>
                      <i class="r" style="width:${share * riskShare / 100}%"></i>
                    </span>
                    ${x.low || x.out
                      ? `<span class="cat-chips">
                          ${x.out ? `<span class="pill out">${x.out} out</span>` : ''}
                          ${x.low ? `<span class="pill low">${x.low} low</span>` : ''}
                        </span>`
                      : ''}
                  </span>
                  <span class="cat-v">
                    <b>${byVal ? money(x.val).replace('.00', '') : x.items}</b>
                    <span>${Math.round(share)}% of ${byVal ? 'value' : 'lines'}</span>
                  </span>
                </button>
              `;
            }).join('')
          : empty('▤', 'No parts at this warehouse', 'Add stock or switch warehouse to see the breakdown.')}
      </div>
      <div class="card-b" style="border-top:1px solid var(--line);font-size:11.5px;color:var(--ink2)">
        Bar length is each category's share of ${byVal ? 'total stock value' : 'total line items'};
        the red segment is the portion sitting at or below minimum. Tap a row to open that category.
      </div>
    </div>
  `;
}

/**
 * Switch the category breakdown between value and line count
 */
function setCatMode(m) {
  VIEW.catMode = m;
  render();
}

/**
 * Switch the stock in vs out chart between day, week, month and year
 */
function setFlowMode(m) {
  VIEW.flowMode = FLOW_SPANS[m] ? m : 'month';
  render();
}

/**
 * Open the parts page filtered to one category
 */
function goCat(c) {
  VIEW.page = 'parts';
  VIEW.q = '';
  VIEW.stock = 'all';
  VIEW.tab = 'all';
  VIEW.cat = c;

  $('#rail').classList.remove('on');
  $('#scrim').classList.remove('on');

  buildNav();
  render();
  window.scrollTo(0, 0);
}

/* ---------- consumption + goods in ---------- */

/**
 * Consumption, replenishment, 12-month trend and top consumers
 */
function useBlock() {
  const w = use(weekStart());
  const m = use(monthStart());
  const y = use(yearStart());
  const iw = stockIn(weekStart());
  const im = stockIn(monthStart());
  const iy = stockIn(yearStart());

  const d = today();
  const wkDays = ((d.getDay() + 6) % 7) + 1;
  const moDays = d.getDate();
  const doy = Math.floor((d - yearStart()) / DAY) + 1;

  const mode = VIEW.flowMode || 'month';
  const span = FLOW_SPANS[mode] || FLOW_SPANS.month;
  const bars = flowBy(mode);
  const peak = Math.max(...bars.map((b) => Math.max(b.in, b.out)), 1);
  const top = topUsed(monthStart(), 5);
  const topMax = Math.max(...top.map((t) => t.val), 1);

  const burn = y.val / Math.max(doy, 1) * 30.4;
  const cover = burn > 0 ? (stockValue() / burn).toFixed(1) : '—';

  const net = (a, b) => {
    const n = a - b;
    return `<span class="${n < 0 ? 'up' : 'dn'}">${n < 0 ? '▼' : '▲'} ${money(Math.abs(n)).replace('.00', '')}</span>
      ${n < 0 ? 'net drawdown' : 'net build-up'}`;
  };

  const card = (lbl, u, prev, sub, cls) => `
    <div class="kpi ${cls}">
      <div class="kpi-l">${lbl}</div>
      <div class="kpi-v">${money(u.val).replace('.00', '')}</div>
      <div class="kpi-d">${u.qty} items · ${u.n} movement${u.n === 1 ? '' : 's'}</div>
      <div class="kpi-d">${percentChange(u.val, prev.val)}</div>
      <div class="kpi-d" style="color:var(--ink3)">${sub}</div>
    </div>
  `;

  const received = stockIn(weekStart()).lines;

  return `
    <div class="card">
      <div class="card-h">
        <div>
          <div class="card-t">Consumption — stock out</div>
          <div class="card-s">Parts issued from the store · ${VIEW.site === 'all' ? 'all warehouses' : siteName(VIEW.site)}</div>
        </div>
        <div class="r">${canSee('log') ? '<button class="btn sm" data-go="log">Movements</button>' : ''}</div>
      </div>
      <div class="card-b">
        <div class="kpis" style="margin-bottom:0">
          ${card('This week', w, usePrev('week'), `Mon–today · day ${wkDays} of 7`, 'br')}
          ${card('This month', m, usePrev('month'), `1–${moDays} ${MON[d.getMonth()]} ${d.getFullYear()}`, 'ord')}
          ${card('Year to date', y, usePrev('year'), `1 Jan – ${moDays} ${MON[d.getMonth()]} · day ${doy}`, 'ok')}
          <div class="kpi low">
            <div class="kpi-l">Avg burn rate</div>
            <div class="kpi-v">${money(burn).replace('.00', '')}</div>
            <div class="kpi-d">per month, YTD average</div>
            <div class="kpi-d">${Math.round(y.qty / Math.max(doy, 1) * 30.4)} items / month</div>
            <div class="kpi-d" style="color:var(--ink3)">${cover} months of cover on hand</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-h">
        <div>
          <div class="card-t">New stock in</div>
          <div class="card-s">Goods received and booked into the store</div>
        </div>
        <div class="r">${can('receive') ? '<button class="btn sm pri" onclick="receiveModal()">Receive stock</button>' : ''}</div>
      </div>
      <div class="card-b">
        <div class="kpis" style="margin-bottom:0">
          ${card('This week', iw, flowPrev('receive', 'week'), net(iw.val, w.val), 'br')}
          ${card('This month', im, flowPrev('receive', 'month'), net(im.val, m.val), 'ord')}
          ${card('Year to date', iy, flowPrev('receive', 'year'), net(iy.val, y.val), 'ok')}
          <div class="kpi ${iy.val < y.val ? 'out' : 'ok'}">
            <div class="kpi-l">Replenishment ratio</div>
            <div class="kpi-v">${y.val ? Math.round(iy.val / y.val * 100) : 0}%</div>
            <div class="kpi-d">received vs issued, YTD</div>
            <div class="kpi-d" style="color:var(--ink3)">
              ${iy.val < y.val
                ? 'Drawing stock down faster than replacing it'
                : 'Replacing at or above the burn rate'}
            </div>
          </div>
        </div>

        ${received.length
          ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
              color:var(--ink3);margin:16px 0 2px">Received this week</div>
            ${received.slice(0, ROWCAP).map((l) => {
              const p = partById(l.part);
              return `
                <div class="kv">
                  <span style="color:var(--ink)">${esc(p ? p.name : '—')}
                    <span class="mono" style="font-size:11px;color:var(--ink3)">
                      ${p ? esc(p.sku) : ''} · ${esc(l.site)} · ${ago(l.ts)}</span>
                  </span>
                  <b class="mono">+${l.qty} ${p ? esc(p.unit) : ''}</b>
                </div>
              `;
            }).join('')}
            ${received.length > ROWCAP && canSee('log')
              ? `<button class="morerow" style="border-radius:8px;margin-top:10px;border:1px solid var(--line)"
                  onclick="goLog('receive')">View all ${received.length} receipts
                  <span>+${received.length - ROWCAP} more</span></button>`
              : ''}`
          : ''}
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="card-h">
          <div>
            <div class="card-t">Stock in vs stock out</div>
            <div class="card-s">${span.label} by value</div>
          </div>
          <div class="r">
            <div class="seg">
              ${[['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([k, l]) =>
                `<button class="${mode === k ? 'on' : ''}" onclick="setFlowMode('${k}')">${l}</button>`
              ).join('')}
            </div>
          </div>
        </div>
        <div class="card-b">
          <div class="bars">
            ${bars.map((b, i) => {
              // 30 daily labels would collide, so caption every fifth bar and today
              const showLabel = mode !== 'day' || i % 5 === 0 || b.now;
              return `
                <div class="bcol ${b.now ? 'now' : ''}"
                  title="${b.label}${mode === 'year' ? '' : ' ' + b.year} — in ${money(b.in)} (${b.inQty}) · out ${money(b.out)} (${b.outQty})">
                  <div class="pair">
                    <i class="bin" style="height:${Math.max(b.in / peak * 100, 1)}%"></i>
                    <i class="bout" style="height:${Math.max(b.out / peak * 100, 1)}%"></i>
                  </div>
                  <span>${showLabel ? b.label : '&nbsp;'}</span>
                </div>
              `;
            }).join('')}
          </div>
          <div class="legend">
            <span><i style="background:var(--ok)"></i>Received in</span>
            <span><i style="background:var(--brand)"></i>Issued out</span>
            <span>${span.partial} is still running</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h">
          <div>
            <div class="card-t">Top consumers this month</div>
            <div class="card-s">Where the spend is going</div>
          </div>
        </div>
        <div class="card-b">
          ${top.length
            ? `<div class="top5">${top.map((t) => `
                <div class="t5r">
                  <div class="t5n">
                    <b>${esc(t.p.name)}</b>
                    <div class="psku">${esc(t.p.sku)} · ${t.qty} ${esc(t.p.unit)} issued</div>
                  </div>
                  <div class="t5b"><div class="sb"><i style="width:${t.val / topMax * 100}%"></i></div></div>
                  <div class="t5v">${money(t.val).replace('.00', '')}</div>
                </div>
              `).join('')}</div>`
            : empty('▤', 'Nothing issued yet this month', 'Issued parts appear here as they leave the store.')}
        </div>
      </div>
    </div>
  `;
}
