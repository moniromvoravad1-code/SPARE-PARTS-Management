/**
 * js/utils/math.js - Mathematical and calculation utilities
 */

// Generate week start date (Monday)
function weekStart() {
  const d = today();
  return new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY);
}

// Generate month start date
function monthStart() {
  const d = today();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Generate year start date
function yearStart() {
  const d = today();
  return new Date(d.getFullYear(), 0, 1);
}

// Calculate percentage change
function percentChange(current, previous) {
  if (!previous) return current ? '<span class="up">new</span>' : '<span class="fl">no prior data</span>';
  const p = Math.round((current - previous) / previous * 100);
  if (Math.abs(p) < 1) return '<span class="fl">level</span> vs last period';
  return `<span class="${p > 0 ? 'up' : 'dn'}">${p > 0 ? '▲' : '▼'} ${Math.abs(p)}%</span> vs last period`;
}

// Stock bar proportions
function stockBarProportions(part) {
  const span = Math.max(part.min * 2, part.qty, 1);
  const width = Math.min(100, part.qty / span * 100);
  const minMark = Math.min(100, part.min / span * 100);
  return { width, minMark, span };
}

// Photo size calculation
function photoBytes(photoObj) {
  return Object.values(photoObj).reduce((a, s) => a + s.length, 0);
}

// Calculate inventory value
function inventoryValue(parts) {
  return parts.reduce((a, p) => a + p.qty * p.cost, 0);
}
