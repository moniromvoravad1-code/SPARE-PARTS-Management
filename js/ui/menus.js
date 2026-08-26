/**
 * js/ui/menus.js - Context menu system
 */

/**
 * Close the current menu
 */
function closeMenu() {
  $('#menu').classList.remove('on');
}

/**
 * Open a context menu
 * @param {HTMLElement} anchor - Anchor element
 * @param {string} html - Menu HTML content
 */
function openMenu(anchor, html) {
  const m = $('#menu');
  m.innerHTML = html;
  m.classList.add('on');
  
  // Position menu relative to anchor
  const r = anchor.getBoundingClientRect();
  const w = m.offsetWidth;
  const h = m.offsetHeight;
  
  let l = Math.min(r.left, window.innerWidth - w - 10);
  let t = r.bottom + 6;
  
  // If menu goes off bottom, show above instead
  if (t + h > window.innerHeight - 10) {
    t = Math.max(10, r.top - h - 6);
  }
  
  m.style.left = Math.max(10, l) + 'px';
  m.style.top = t + 'px';
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#menu') && !e.target.closest('[data-menu]')) {
    closeMenu();
  }
});

/**
 * Create menu item HTML
 * @param {string} label - Item label
 * @param {string} onclick - Click handler
 * @param {boolean} [isDanger] - Red color for danger actions
 */
function menuItem(label, onclick, isDanger = false) {
  return `<button ${isDanger ? 'class="dgr"' : ''} onclick="${onclick}">${esc(label)}</button>`;
}

/**
 * Create menu divider
 */
function menuDivider() {
  return '<div class="div"></div>';
}

/**
 * Create menu header
 */
function menuHeader(text) {
  return `<div class="mh">${esc(text)}</div>`;
}
