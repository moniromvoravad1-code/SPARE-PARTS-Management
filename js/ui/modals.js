/**
 * js/ui/modals.js - Modal dialog system
 */

/**
 * Close the current modal
 */
function closeModal() {
  $('#mask').classList.remove('on');
  $('#modal').classList.remove('wide');
  $('#modal').innerHTML = '';
}

/**
 * Open a modal dialog
 * @param {string} title - Modal title
 * @param {string} sub - Subtitle/description
 * @param {string} body - Modal body HTML
 * @param {string} footer - Footer with buttons HTML
 */
function openModal(title, sub, body, footer, wide) {
  const modalHtml = `
    <div class="m-h">
      <div>
        <div class="m-t">${esc(title)}</div>
        ${sub ? `<div class="m-s">${esc(sub)}</div>` : ''}
      </div>
      <button class="m-x" onclick="closeModal()">✕</button>
    </div>
    <div class="m-b">${body}</div>
    ${footer ? `<div class="m-f">${footer}</div>` : ''}
  `;
  $('#modal').innerHTML = modalHtml;
  $('#modal').classList.toggle('wide', !!wide);
  $('#mask').classList.add('on');
  
  // Auto-focus first input (desktop only)
  const f = $('#modal').querySelector('input:not([type=file]),select,textarea');
  if (f && window.innerWidth > 860) {
    setTimeout(() => f.focus(), 60);
  }
}

/**
 * Alert dialog
 */
function alertModal(title, message) {
  openModal(
    title,
    null,
    `<p style="color:var(--ink2); line-height:1.5">${esc(message)}</p>`,
    `<button class="btn pri" onclick="closeModal()">OK</button>`
  );
}

/**
 * Confirm dialog
 */
function confirmModal(title, message, onConfirm) {
  openModal(
    title,
    null,
    `<p style="color:var(--ink2); line-height:1.5">${esc(message)}</p>`,
    `
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn pri" onclick="(${onConfirm})(); closeModal()">Confirm</button>
    `
  );
}

// Close modal when clicking on background
$('#mask').addEventListener('click', (e) => {
  if (e.target.id === 'mask') closeModal();
});
