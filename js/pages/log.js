/**
 * js/pages/log.js - Activity log
 */

/**
 * Render the activity log page
 */
function renderLog() {
  // The audit trail is manager-only, both to read and to take away
  if (!canSee('log')) {
    $('#page').innerHTML = empty('🔒', 'Manager access required',
      'The activity log is only available to managers.');
    return;
  }

  const filters = [
    ['all', 'All activity'], ['issue', 'Issues'], ['receive', 'Receipts'],
    ['adjust', 'Adjustments'], ['checkout', 'Tool movements'],
    ['cal', 'Calibration'], ['po', 'Purchasing']
  ];

  $('#page').innerHTML = `
    <div class="tools">
      <div class="srch">
        <input id="q" placeholder="Search activity…" value="${esc(VIEW.q)}">
      </div>
      <select class="sel" data-filter="tab">
        ${filters.map(([k, l]) =>
          `<option value="${k}" ${VIEW.tab === k ? 'selected' : ''}>${l}</option>`
        ).join('')}
      </select>
      ${can('export') ? '<button class="btn" onclick="expLogCSV()">Download CSV</button>' : ''}
      ${can('export') ? '<button class="btn" onclick="window.print()">Print</button>' : ''}
    </div>
    <div class="card"><div class="card-b flush" id="listHost">${logList()}</div></div>
  `;
}

/**
 * Download the activity currently on screen, filters and all
 */
async function expLogCSV() {
  if (!can('export')) return toast('Manager access required', 'bad');

  const L = filterLog();
  if (!L.length) return toast('Nothing to download', 'bad');

  const head = ['When', 'Type', 'By', 'Site', 'Detail', 'Part', 'Qty', 'Value'];
  const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

  const rows = L.map((l) => {
    const p = l.part ? partById(l.part) : null;
    return [
      new Date(l.ts).toISOString(), l.type, l.by, l.site || '', l.txt,
      p ? p.sku : '', l.qty == null ? '' : l.qty, l.value == null ? '' : l.value
    ].map(q).join(',');
  });

  const ok = await dl(`voltgrid-activity-${iso(today())}.csv`, [head.join(','), ...rows].join('\n'), 'text/csv');
  if (ok) {
    logIt('export', `Downloaded activity log (${L.length} entries)`, VIEW.site);
    saveState();
    toast(`Activity log downloaded — ${L.length} entries`, 'good');
  }
}

/**
 * Activity entries matching the current site, filter and search, newest first
 */
function filterLog() {
  const q = VIEW.q.toLowerCase();

  // Tool movements cover both directions
  const grp = { checkout: ['checkout', 'checkin'] };

  return S.log
    .filter((l) => VIEW.site === 'all' || l.site === VIEW.site)
    .filter((l) => VIEW.tab === 'all' || l.type === VIEW.tab || (grp[VIEW.tab] || []).includes(l.type))
    .filter((l) => !q || (l.txt + ' ' + l.by).toLowerCase().includes(q));
}

/**
 * Rendered activity list
 */
function logList() {
  if (!canSee('log')) return empty('🔒', 'Manager access required', '');

  const L = filterLog();

  if (!L.length) return empty('≡', 'No matching activity', '');

  const ic = {
    issue: '↑', receive: '↓', adjust: '≠', checkout: '⚒', checkin: '↩',
    po: '⇄', cal: '◎', edit: '✎', add: '＋', del: '✕'
  };

  const tone = {
    issue: 'low', receive: 'br', adjust: 'low', checkout: 'ord',
    checkin: 'br', po: 'ord', cal: 'br', del: 'out'
  };

  return L.slice(0, 200).map((l) => `
    <div class="al">
      <div class="al-i ${tone[l.type] || 'br'}">${ic[l.type] || '•'}</div>
      <div style="min-width:0">
        <div class="al-t" style="font-weight:500">${esc(l.txt)}</div>
        <div class="al-s">${esc(l.by)} · ${esc(l.site || '—')} · ${fmtDT(l.ts)}</div>
      </div>
      <div class="al-r" style="color:var(--ink3)">${ago(l.ts)}</div>
    </div>
  `).join('');
}
