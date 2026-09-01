/**
 * js/models/logs.js - Activity log queries and filtering
 */

/**
 * Get flow of movements (issues/receives) between two dates
 * @param {string} type - 'issue' or 'receive'
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Object} {qty, val, n, lines}
 */
function flow(type, from, to) {
  const a = +from;
  const b = to == null ? Date.now() + DAY : +to;
  const L = S.log.filter(
    (l) =>
      l.type === type &&
      l.qty &&
      (VIEW.site === 'all' || l.site === VIEW.site) &&
      l.ts >= a &&
      l.ts < b
  );
  return {
    qty: L.reduce((s, l) => s + l.qty, 0),
    val: L.reduce((s, l) => s + (l.value || 0), 0),
    n: L.length,
    lines: L
  };
}

/**
 * How many buckets each period shows, and what the last one is called
 */
const FLOW_SPANS = {
  day: { n: 30, label: 'Last 30 days', partial: 'today' },
  week: { n: 12, label: 'Last 12 weeks', partial: 'this week' },
  month: { n: 12, label: 'Last 12 months', partial: 'this month' },
  year: { n: 5, label: 'Last 5 years', partial: 'this year' }
};

/**
 * Value in and out per period, oldest first.
 *
 * The last bucket is the one in progress, so it is always short — it is
 * flagged with `now` so the chart can mark it as partial rather than let it
 * read as a collapse in activity.
 *
 * @param {string} kind - 'day' | 'week' | 'month' | 'year'
 * @param {number} [count] - buckets to return; defaults to the span above
 */
function flowBy(kind, count) {
  const span = FLOW_SPANS[kind] || FLOW_SPANS.month;
  const n = count || span.n;
  const d = today();
  const out = [];

  const bucket = (from, to, label, year, now) => {
    const issued = use(from, to);
    const received = stockIn(from, to);
    return {
      label,
      year,
      out: issued.val,
      in: received.val,
      outQty: issued.qty,
      inQty: received.qty,
      now
    };
  };

  for (let i = n - 1; i >= 0; i--) {
    const now = i === 0;
    let from;
    let to;
    let label;

    if (kind === 'day') {
      from = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
      to = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i + 1);
      label = String(from.getDate());
    } else if (kind === 'week') {
      const ws = weekStart();
      from = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() - i * 7);
      to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
      label = from.getDate() + ' ' + MON[from.getMonth()];
    } else if (kind === 'year') {
      const y = d.getFullYear() - i;
      from = new Date(y, 0, 1);
      to = new Date(y + 1, 0, 1);
      label = String(y);
    } else {
      from = new Date(d.getFullYear(), d.getMonth() - i, 1);
      to = new Date(d.getFullYear(), d.getMonth() - i + 1, 1);
      label = MON[from.getMonth()];
    }

    out.push(bucket(from, to, label, from.getFullYear(), now));
  }

  return out;
}

/**
 * Get parts issued out of store
 */
const use = (f, t) => flow('issue', f, t);

/**
 * Get goods received into store
 */
const stockIn = (f, t) => flow('receive', f, t);

/**
 * Get flow from previous period (for comparisons)
 */
function flowPrev(type, kind) {
  const now = Date.now();
  
  if (kind === 'week') {
    const w = +weekStart();
    return flow(type, w - 7 * DAY, w - 7 * DAY + (now - w));
  }
  
  if (kind === 'month') {
    const m = monthStart();
    const el = now - m;
    const pm = new Date(m.getFullYear(), m.getMonth() - 1, 1);
    return flow(type, pm, +pm + el);
  }
  
  const y = yearStart();
  const el = now - y;
  const py = new Date(y.getFullYear() - 1, 0, 1);
  return flow(type, py, +py + el);
}

const usePrev = (k) => flowPrev('issue', k);

/**
 * Get consumption by calendar month
 */
function byMonth(n) {
  const out = [];
  const d = today();
  
  for (let i = n - 1; i >= 0; i--) {
    const s = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const e = new Date(d.getFullYear(), d.getMonth() - i + 1, 1);
    const o = use(s, e);
    const inn = stockIn(s, e);
    
    out.push({
      label: MON[s.getMonth()],
      year: s.getFullYear(),
      out: o.val,
      in: inn.val,
      outQty: o.qty,
      inQty: inn.qty,
      now: i === 0
    });
  }
  
  return out;
}

const useByMonth = (n) => byMonth(n);

/**
 * Get top consumed parts
 */
function topUsed(from, limit) {
  const m = {};
  
  use(from).lines.forEach((l) => {
    if (!m[l.part]) m[l.part] = { qty: 0, val: 0 };
    m[l.part].qty += l.qty;
    m[l.part].val += l.value || 0;
  });
  
  return Object.entries(m)
    .map(([id, v]) => ({ p: partById(id), ...v }))
    .filter((x) => x.p)
    .sort((a, b) => b.val - a.val)
    .slice(0, limit || 5);
}
