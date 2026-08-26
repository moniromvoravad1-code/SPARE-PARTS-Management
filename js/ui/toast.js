/**
 * js/ui/toast.js - Toast notification system
 */

let toastTimeout;

/**
 * Show toast notification
 * @param {string} msg - Message to display
 * @param {string} [kind] - 'good', 'bad', or null for neutral
 */
function toast(msg, kind) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast on' + (kind ? ' ' + kind : '');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    t.className = 'toast';
  }, 2400);
}

// Shorthand toast messages
const showToast = {
  success: (msg) => toast(msg, 'good'),
  error: (msg) => toast(msg, 'bad'),
  info: (msg) => toast(msg)
};
