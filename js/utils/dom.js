/**
 * js/utils/dom.js - DOM query and manipulation helpers
 */

// Query shortcuts
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// Escape HTML special characters
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

// Generate unique ID
const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);

// Create HTML element from string
function createHTML(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html.trim();
  return temp.firstChild;
}

// Add class with animation
function addClass(elem, cls) {
  if (elem) elem.classList.add(cls);
}

// Remove class with animation
function removeClass(elem, cls) {
  if (elem) elem.classList.remove(cls);
}

// Toggle class
function toggleClass(elem, cls) {
  if (elem) elem.classList.toggle(cls);
}

// Check if element has class
function hasClass(elem, cls) {
  return elem && elem.classList.contains(cls);
}

// Get closest parent matching selector
function closest(elem, selector) {
  return elem ? elem.closest(selector) : null;
}
