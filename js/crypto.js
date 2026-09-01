/**
 * js/crypto.js - Password hashing
 *
 * Accounts are shared through the Google Sheet, so a password must never leave
 * the device in a form anyone can read. Records carry PBKDF2-SHA-256 with a
 * per-account random salt.
 *
 * Be clear about what this buys: it protects against READING, not against
 * attacking. It keeps passwords off the screen, out of the backup file and out
 * of the sheet. Anyone who obtains the sheet still has salt and hash and can
 * grind offline as fast as their hardware allows - there is no server here to
 * withhold a secret or impose a rate limit. PBKDF2 makes each guess expensive;
 * it cannot rescue a weak password.
 *
 * Values are hex, never base64: a Google Sheets cell whose text starts with
 * + - = or @ is parsed as a formula, and hex can only ever start [0-9a-f].
 */

const PW_ALG = 'pbkdf2-sha256';
const PW_ITER = 150000;         // WebCrypto: ~90ms
const PW_ITER_JS = 20000;       // bundled fallback: ~1s on a slow phone

/** Which engine this device ended up with. Set by initPwEngine(). */
let PW_ENGINE = 'subtle';

/**
 * Pick the hashing engine with a real round trip, not a typeof check - a stub
 * can exist and still throw. WebCrypto needs a secure context, which covers
 * https and file:// but NOT a plain http:// LAN address, and this app travels.
 */
async function initPwEngine() {
  try {
    const d = await crypto.subtle.digest('SHA-256', new Uint8Array([1]));
    PW_ENGINE = d && d.byteLength === 32 ? 'subtle' : 'js';
  } catch (e) {
    PW_ENGINE = 'js';
  }

  if (PW_ENGINE === 'js') console.warn('WebCrypto unavailable — using the bundled hash');
  return PW_ENGINE;
}

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

function unhex(s) {
  const a = new Uint8Array(s.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16);
  return a;
}

/**
 * 16 random bytes. Deliberately not uid() - that is Math.random, which is not
 * a source anyone should build a salt from.
 */
function newSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return hex(a);
}

/* ---------- bundled SHA-256, for when WebCrypto is not available ---------- */

const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function sha256(bytes) {
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  const len = bytes.length;
  const withPad = new Uint8Array((((len + 9) >> 6) + 1) << 6);
  withPad.set(bytes);
  withPad[len] = 0x80;

  const bits = len * 8;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 4, bits >>> 0, false);
  dv.setUint32(withPad.length - 8, Math.floor(bits / 4294967296), false);

  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K256[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e;
      e = (d + t1) >>> 0;
      d = c; c = b; b = a;
      a = (t1 + t2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  H.forEach((v, i) => odv.setUint32(i * 4, v, false));
  return out;
}

function hmacSha256(key, msg) {
  let k = key.length > 64 ? sha256(key) : key;

  const pad = new Uint8Array(64);
  pad.set(k);

  const inner = new Uint8Array(64 + msg.length);
  const outer = new Uint8Array(64 + 32);

  for (let i = 0; i < 64; i++) {
    inner[i] = pad[i] ^ 0x36;
    outer[i] = pad[i] ^ 0x5c;
  }
  inner.set(msg, 64);
  outer.set(sha256(inner), 64);

  return sha256(outer);
}

function pbkdf2Js(pw, salt, iter, dkLen) {
  const out = new Uint8Array(dkLen);
  const blocks = Math.ceil(dkLen / 32);

  for (let b = 1; b <= blocks; b++) {
    const first = new Uint8Array(salt.length + 4);
    first.set(salt);
    new DataView(first.buffer).setUint32(salt.length, b, false);

    let u = hmacSha256(pw, first);
    const acc = u.slice();

    for (let i = 1; i < iter; i++) {
      u = hmacSha256(pw, u);
      for (let j = 0; j < 32; j++) acc[j] ^= u[j];
    }

    out.set(acc.subarray(0, Math.min(32, dkLen - (b - 1) * 32)), (b - 1) * 32);
  }

  return out;
}

/* ---------- the API the rest of the app uses ---------- */

/**
 * Derive a key. `iter` comes from the record being verified, not from a
 * constant, so a record hashed on one engine still verifies on the other.
 */
async function pwDerive(password, saltHex, iter) {
  const salt = unhex(saltHex);
  const pw = new TextEncoder().encode(password);

  if (PW_ENGINE === 'subtle') {
    const k = await crypto.subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256);
    return hex(new Uint8Array(bits));
  }

  return hex(pbkdf2Js(pw, salt, iter, 32));
}

/** The credential fields for a new password. */
async function pwHash(password) {
  const salt = newSalt();
  const pwIter = PW_ENGINE === 'subtle' ? PW_ITER : PW_ITER_JS;

  return { pwAlg: PW_ALG, pwIter, salt, hash: await pwDerive(password, salt, pwIter) };
}

/**
 * Compare without an early exit on the first differing character. Real
 * constant time is not achievable in JS, but leaking the length of the common
 * prefix is free to avoid.
 */
function pwEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;

  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Set an account's password, dropping any cleartext it still carried. */
async function pwSet(acc, password) {
  Object.assign(acc, await pwHash(password), { updated: Date.now() });
  delete acc.p;
  return acc;
}

/**
 * Check a password, upgrading a legacy cleartext record on the first correct
 * sign-in. Hashing every account at load would block startup for a second per
 * account on the fallback engine; doing it here spends that time at the one
 * moment the person is already waiting.
 *
 * @returns {Promise<boolean>}
 */
async function pwVerify(acc, password) {
  if (!acc) return false;

  if (!acc.hash && acc.p !== undefined) {
    if (String(acc.p) !== password) return false;
    await pwSet(acc, password);
    return true;
  }

  if (!acc.hash || !acc.salt) return false;

  return pwEq(await pwDerive(password, acc.salt, Number(acc.pwIter) || PW_ITER), acc.hash);
}

/** Does this account still hold a readable password? */
const pwIsLegacy = (u) => !u.hash && u.p !== undefined;

/** A fixed salt for the timing equaliser on an unknown username. */
const PW_DUMMY_SALT = '00000000000000000000000000000000';
