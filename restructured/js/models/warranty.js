/**
 * js/models/warranty.js - Warranty calculations and tracking
 */

/**
 * Calculate warranty expiration date
 */
function warUntil(o) {
  return (o && o.war && o.warFrom) ? addD(o.war * 30, o.warFrom) : null;
}

/**
 * Get warranty state of an item
 * @returns {string} 'none' | 'ok' | 'soon' | 'exp'
 */
function warState(o) {
  const u = warUntil(o);
  if (!u) return 'none';
  const d = daysTo(u);
  return d < 0 ? 'exp' : d <= 60 ? 'soon' : 'ok';
}

/**
 * Get all warranted items (parts and tools combined)
 */
function warItems() {
  return [
    ...S.parts
      .filter(inSite)
      .map((p) => ({
        kind: 'part',
        o: p,
        name: p.name,
        code: p.sku,
        sub: `${p.qty} ${p.unit} on hand`,
        val: p.qty * p.cost
      })),
    ...S.tools
      .filter(inSite)
      .map((t) => ({
        kind: 'tool',
        o: t,
        name: t.name,
        code: t.code,
        sub: t.cat,
        val: 0
      }))
  ]
    .map((x) => ({
      ...x,
      st: warState(x.o),
      until: warUntil(x.o)
    }));
}

/**
 * Get items with warranty expiring soon (within 60 days)
 */
const warExpiring = () => warItems().filter((x) => x.st === 'soon');

/**
 * Get items with expired warranty
 */
const warExpired = () => warItems().filter((x) => x.st === 'exp');

/**
 * Format warranty info for display
 */
function formatWarranty(o) {
  const state = warState(o);
  if (state === 'none') return 'No warranty';
  
  const until = warUntil(o);
  const days = daysTo(until);
  
  if (state === 'exp') return `Expired ${Math.abs(days)} days ago`;
  if (state === 'soon') return `Expires in ${days} days`;
  return `Valid for ${days} more days`;
}
