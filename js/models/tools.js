/**
 * js/models/tools.js - Tools management and calibration tracking
 */

/**
 * Get calibration state of a tool
 * @returns {string} 'na' | 'ok' | 'due' | 'exp'
 */
function calState(t) {
  if (!t.calInt || !t.calNext) return 'na';
  const d = daysTo(t.calNext);
  if (d < 0) return 'exp';
  if (d <= 30) return 'due';
  return 'ok';
}

/**
 * Get tool state (availability)
 * @returns {string} 'in' | 'out' | 'over' | 'maint'
 */
function toolState(t) {
  if (t.status === 'maint') return 'maint';
  if (t.status === 'out') return t.dueAt && daysTo(t.dueAt) < 0 ? 'over' : 'out';
  return 'in';
}

/**
 * Get all overdue tools (checked out past due date)
 */
const overTools = () => S.tools.filter((t) => inSite(t) && toolState(t) === 'over');

/**
 * Get all tools with calibration due or expired
 */
const calDue = () => S.tools.filter((t) => inSite(t) && ['due', 'exp'].includes(calState(t)));

/**
 * Checkout a tool
 */
function checkoutTool(toolId, holder, dueDate, site) {
  const t = S.tools.find((x) => x.id === toolId);
  if (!t) return false;
  
  t.status = 'out';
  t.holder = holder;
  t.outAt = Date.now();
  t.dueAt = dueDate;
  
  logIt('checkout', `Checked out ${t.name} — ${holder}`, site, { tool: toolId });
  return true;
}

/**
 * Return a tool
 */
function returnTool(toolId, site) {
  const t = S.tools.find((x) => x.id === toolId);
  if (!t) return false;
  
  t.status = 'in';
  t.holder = '';
  t.outAt = null;
  t.dueAt = null;
  
  logIt('return', `Returned ${t.name}`, site, { tool: toolId });
  return true;
}

/**
 * Update tool calibration record
 */
function calibrateTool(toolId, lastDate, nextDate, cert, site) {
  const t = S.tools.find((x) => x.id === toolId);
  if (!t) return false;
  
  t.calLast = lastDate;
  t.calNext = nextDate;
  t.cert = cert;
  
  logIt('calibration', `Calibrated ${t.name} (Cert: ${cert})`, site, { tool: toolId });
  return true;
}

/**
 * Get tool by ID
 */
const toolById = (id) => S.tools.find((t) => t.id === id);
