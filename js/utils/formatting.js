/**
 * js/utils/formatting.js - Date, currency, and text formatting
 */

// Get today's date at midnight
function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format date to ISO string (YYYY-MM-DD)
const iso = (d) => new Date(d).toISOString().slice(0, 10);

// Add N days to a date
const addD = (n, base) => iso(new Date((base ? new Date(base) : today()).getTime() + n * DAY));

// Days until a date (negative if past)
const daysTo = (d) => Math.round((new Date(d + 'T00:00:00') - today()) / DAY);

// Format date to readable format
const fmtD = (d) => {
  if (!d) return '—';
  const x = new Date(d + 'T00:00:00');
  return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Format datetime
const fmtDT = (t) => new Date(t).toLocaleString('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
});

// Format as currency
const money = (n) => '$' + (Number(n) || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// Format relative time ("2h ago", "just now", etc.)
const ago = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return fmtDT(t);
};
