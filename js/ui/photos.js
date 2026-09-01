/**
 * js/ui/photos.js - Photo handling, compression, and display
 */

let PH = {}; // Photo storage

/**
 * Get photo source URL for an item
 * @param {Object} o - Part or tool object
 * @returns {string|null} Photo URL or data URI
 */
function photoSrc(o) {
  if (!o || !o.photo) return null;
  
  // External URL
  if (/^https?:\/\//i.test(o.photo)) return o.photo;
  
  // Local storage data URI
  return PH[o.photo] || null;
}

/**
 * Save photos to storage.
 *
 * Mirroring a multi-megabyte photo bag into localStorage is guaranteed to blow
 * its quota, so skip the mirror once IndexedDB has taken the write.
 *
 * @returns {Promise<boolean>} whether the photos are actually safe on this device
 */
async function savePhotos() {
  const r = await dbSet(PH_KEY, PH, { mirror: !STORE.idb });
  if (!r.ok) reportSaveFailure('That photo could not be saved on this device', r);

  return r.ok;
}

/**
 * Get any item by ID (part or tool)
 */
function anyById(id) {
  return partById(id) || S.tools.find((t) => t.id === id) || null;
}

/**
 * Compress image file to data URI
 * @param {File} file - Image file to compress
 * @returns {Promise<string>} Data URI of compressed image
 */
function shrinkImage(file) {
  return new Promise((res, rej) => {
    // Validate file type
    if (!/^image\//.test(file.type)) {
      return rej(new Error('That file is not an image'));
    }
    
    const r = new FileReader();
    r.onerror = () => rej(new Error('Could not read that file'));
    r.onload = (e) => {
      const img = new Image();
      img.onerror = () => rej(new Error('Could not open that image'));
      img.onload = () => {
        try {
          // Calculate scaled dimensions
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          const sc = Math.min(1, PH_MAX / Math.max(w, h));
          w = Math.max(1, Math.round(w * sc));
          h = Math.max(1, Math.round(h * sc));
          
          // Draw to canvas
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const x = c.getContext('2d');
          x.fillStyle = '#fff';
          x.fillRect(0, 0, w, h);
          x.drawImage(img, 0, 0, w, h);
          
          // Return compressed JPEG
          res(c.toDataURL('image/jpeg', PH_Q));
        } catch (err) {
          rej(new Error('Could not process that image'));
        }
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}

/**
 * Create thumbnail HTML for an item
 * @param {Object} o - Item object
 * @param {string} fallback - Fallback text
 * @param {string} cls - CSS class
 */
function thumb(o, fallback, cls) {
  const src = photoSrc(o);
  const classes = 'th ' + (cls || '');
  
  if (src) {
    return `
      <img class="${classes}" src="${esc(src)}" alt="" loading="lazy"
        onclick="event.stopPropagation();viewPhoto('${o.id}')"
        onerror="this.outerHTML='<div class=\\'th ph0 ${cls||''}\\'>?</div>'">
    `;
  }
  
  return `<div class="th ph0 ${cls || ''}">${esc((fallback || '—').slice(0, 2).toUpperCase())}</div>`;
}

/**
 * View full-size photo in modal
 */
function viewPhoto(id) {
  const o = anyById(id);
  const src = photoSrc(o);
  
  if (!src) {
    return toast('No photo on this item yet');
  }
  
  openModal(
    o.name,
    o.sku || o.code,
    `
      <img src="${esc(src)}" alt="" style="width:100%;border-radius:10px;display:block">
      <div style="font-size:11.5px;color:var(--ink3);margin-top:10px">
        ${/^https?:/i.test(o.photo) ? 'Linked image · ' + esc(o.photo.slice(0, 60)) : 'Stored on this device'}
      </div>
    `,
    `<button class="btn" onclick="closeModal()">Close</button>`
  );
}

/**
 * Load photos from storage
 */
async function loadPhotos() {
  const loaded = await dbGet(PH_KEY);
  if (loaded) PH = loaded;
}

/* ---------- photo picker (shared by the part and tool editors) ---------- */

// undefined = untouched, '' = remove, otherwise a data URI or an http link
let EDITPH;

/**
 * Photo field for an editor form - preview plus upload / link / remove
 * @param {Object} o - Part or tool being edited
 */
function photoField(o) {
  EDITPH = undefined;
  const src = photoSrc(o);
  const linked = /^https?:/i.test(o.photo || '');

  return `
    <div class="fld">
      <label>Photo</label>
      <div class="phfld">
        <div id="phPrev">
          ${src ? `<img class="pv" src="${esc(src)}" alt="">` : '<div class="pv ph0">▤</div>'}
        </div>
        <div style="flex:1;min-width:0">
          <div class="ac">
            <label class="lbl-btn">Upload photo
              <input type="file" accept="image/*" style="display:none" onchange="pickPhoto(this)">
            </label>
            <button type="button" class="btn sm" onclick="linkPhoto()">Use a link</button>
            <button type="button" class="btn sm" onclick="clearPhoto()">Remove</button>
          </div>
          <div class="hlp" id="phHint">
            ${src
              ? (linked ? 'Currently linked to an external image.' : 'Stored on this device.')
              : 'On a phone this opens the camera or your gallery.'}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Update the picker preview and hint
 */
function phPreview(src, hint) {
  $('#phPrev').innerHTML = src ? `<img class="pv" src="${esc(src)}" alt="">` : '<div class="pv ph0">▤</div>';
  $('#phHint').textContent = hint;
}

/**
 * Handle a file chosen in the picker - resize, then hold it until save
 */
async function pickPhoto(inp) {
  const f = inp.files && inp.files[0];
  inp.value = '';
  if (!f) return;

  $('#phHint').textContent = 'Processing…';

  try {
    const data = await shrinkImage(f);
    const kb = Math.round(data.length * 0.75 / 1024);

    if (!STORE.idb && !STORE.ls) {
      return phPreview(
        photoSrc({ photo: EDITPH }),
        'This browser is not saving anything from this file, so a photo cannot be kept. Use a link instead.'
      );
    }

    // photoBudget(), not the constant — the picker and the Settings meter have
    // to agree on which backend is live, or one will accept what the other says
    // will not fit.
    if (photoBytes(PH) + data.length > photoBudget()) {
      return phPreview(
        photoSrc({ photo: EDITPH }),
        'Photo storage is full. Remove some photos first, or use a link instead.'
      );
    }

    EDITPH = data;
    phPreview(data, `Ready to save · ${kb} KB (resized from ${Math.round(f.size / 1024)} KB)`);
  } catch (e) {
    phPreview(null, e.message);
  }
}

/**
 * Point the item at an external image instead of storing one
 */
function linkPhoto() {
  const cur = EDITPH !== undefined && /^https?:/i.test(EDITPH || '') ? EDITPH : '';
  const v = prompt('Paste the image address (must start with https://)', cur);
  if (v === null) return;

  const u = v.trim();
  if (!u) {
    EDITPH = '';
    return phPreview(null, 'Photo will be removed on save.');
  }
  if (!/^https?:\/\//i.test(u)) {
    return toast('Links must start with http:// or https://', 'bad');
  }

  EDITPH = u;
  phPreview(u, 'Linked image. Nothing is stored on this device.');
}

/**
 * Queue removal of the current photo
 */
function clearPhoto() {
  EDITPH = '';
  phPreview(null, 'Photo will be removed on save.');
}

/**
 * Apply the pending picker choice to an item
 * @returns {boolean} true if device photo storage changed
 */
function commitPhoto(o) {
  if (EDITPH === undefined) return false;

  // Drop the old device copy - a linked image never had one
  if (o.photo && !/^https?:/i.test(o.photo)) delete PH[o.photo];

  if (EDITPH === '') {
    o.photo = '';
  } else if (/^https?:/i.test(EDITPH)) {
    o.photo = EDITPH;
  } else {
    const id = uid('ph');
    PH[id] = EDITPH;
    o.photo = id;
  }

  EDITPH = undefined;
  return true;
}

// Photos are loaded from initApp(), after initStorage() has chosen a backend.
// Reading here at parse time would go to localStorage every time, whatever the
// app later decides to use.
