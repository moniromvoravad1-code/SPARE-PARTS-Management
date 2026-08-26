/**
 * js/models/parts.js - Parts inventory management
 */

/**
 * Get stock state of a part
 * @param {Object} p - Part object
 * @returns {string} 'ok' | 'low' | 'out'
 */
function stockState(p) {
  if (p.qty <= 0) return 'out';
  if (p.qty <= p.min) return 'low';
  return 'ok';
}

/**
 * Get all parts with low stock
 */
const lowParts = () => S.parts.filter((p) => inSite(p) && stockState(p) !== 'ok');

/**
 * Get part by ID
 */
const partById = (id) => S.parts.find((p) => p.id === id);

/**
 * Get total stock value for current site
 */
const stockValue = () => S.parts.filter(inSite).reduce((a, p) => a + p.qty * p.cost, 0);

/**
 * Suggested reorder quantity - back up to twice the minimum, never less than one
 */
const reorderQty = (p) => Math.max(p.min * 2 - p.qty, p.min, 1);

/**
 * Create a new part
 */
function createPart(sku, name, cat, site, qty, min, unit, bin, cost, sup, lt) {
  return {
    id: uid('p'),
    sku,
    name,
    cat,
    site,
    qty,
    min,
    unit,
    bin,
    cost,
    sup,
    lt,
    photo: '',
    updated: Date.now()
  };
}

/**
 * Issue (decrease) part quantity
 */
function issuePart(partId, qty, site) {
  const p = partById(partId);
  if (!p) return false;
  
  p.qty = Math.max(0, p.qty - qty);
  p.updated = Date.now();
  
  const value = qty * p.cost;
  logIt('issue', `Issued ${qty} × ${p.name}`, site, {
    part: partId,
    qty,
    value
  });
  
  return true;
}

/**
 * Receive (increase) part quantity
 */
function receivePart(partId, qty, site) {
  const p = partById(partId);
  if (!p) return false;
  
  p.qty += qty;
  p.updated = Date.now();
  
  const value = qty * p.cost;
  logIt('receive', `Received ${qty} × ${p.name}`, site, {
    part: partId,
    qty,
    value
  });
  
  return true;
}

/**
 * Adjust part count (inventory correction)
 */
function adjustPart(partId, newQty, reason) {
  const p = partById(partId);
  if (!p) return false;
  
  const delta = newQty - p.qty;
  p.qty = newQty;
  p.updated = Date.now();
  
  logIt('adjust', `Stock adjustment: ${p.name} → ${newQty} (${reason})`, p.site);
  return true;
}

/**
 * Delete part (soft delete via log)
 */
function deletePart(partId) {
  const p = partById(partId);
  if (!p) return false;
  
  const idx = S.parts.indexOf(p);
  if (idx >= 0) {
    S.parts.splice(idx, 1);
    logIt('delete', `Deleted part: ${p.name}`, p.site);
    return true;
  }
  return false;
}
