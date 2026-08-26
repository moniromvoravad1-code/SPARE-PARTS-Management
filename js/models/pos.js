/**
 * js/models/pos.js - Purchase order management
 */

/**
 * Get all open purchase orders (draft, ordered, shipped)
 */
const openPOs = () => S.pos.filter((o) => inSite(o) && ['draft', 'ordered', 'shipped'].includes(o.status));

/**
 * Get PO by ID
 */
const poById = (id) => S.pos.find((o) => o.id === id);

/**
 * Parts below minimum that are not already on an open order
 */
function sugList() {
  return lowParts().filter((p) => !openPOs().some((o) => o.lines.some((l) => l.part === p.id)));
}

/**
 * Create new purchase order
 */
function createPO(supplier, site, lines, notes) {
  const po = {
    id: uid('po'),
    no: `PO-${Date.now().toString().slice(-6)}`,
    sup: supplier,
    site,
    status: 'draft',
    created: Date.now(),
    eta: null,
    by: VIEW.user ? VIEW.user.u : 'system',
    notes,
    lines: lines || []
  };
  
  S.pos.push(po);
  logIt('po', `Created ${po.no} — ${supplier}, ${lines.length} line(s)`, site, { po: po.id });
  
  return po;
}

/**
 * Update PO status
 */
function updatePOStatus(poId, newStatus, eta) {
  const po = poById(poId);
  if (!po) return false;
  
  const oldStatus = po.status;
  po.status = newStatus;
  if (eta) po.eta = eta;
  
  logIt('po', `Updated ${po.no}: ${oldStatus} → ${newStatus}`, po.site, { po: poId });
  return true;
}

/**
 * Add line item to PO
 */
function addPOLine(poId, partId, qty, cost) {
  const po = poById(poId);
  if (!po) return false;
  
  po.lines.push({
    part: partId,
    qty,
    cost
  });
  
  return true;
}

/**
 * Remove line item from PO
 */
function removePOLine(poId, lineIndex) {
  const po = poById(poId);
  if (!po || lineIndex < 0 || lineIndex >= po.lines.length) return false;
  
  po.lines.splice(lineIndex, 1);
  return true;
}

/**
 * Get PO line value
 */
function poLineValue(line) {
  return line.qty * line.cost;
}

/**
 * Calculate total PO value
 */
function poTotal(po) {
  return po.lines.reduce((a, l) => a + poLineValue(l), 0);
}

/**
 * Approve a PO (manager only)
 */
function approvePO(poId) {
  if (!can('poApprove')) return false;
  
  return updatePOStatus(poId, 'ordered');
}

/**
 * Receive a PO
 */
function receivePO(poId) {
  const po = poById(poId);
  if (!po || po.status !== 'shipped') return false;
  
  // Receive each line item
  po.lines.forEach((line) => {
    receivePart(line.part, line.qty, po.site);
  });
  
  updatePOStatus(poId, 'received');
  logIt('receive', `Received ${po.no} from ${po.sup}`, po.site, { po: poId });
  
  return true;
}
