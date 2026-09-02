/**
 * js/auth.js - Authentication and login system
 */

// Authentication state tracking
let AUTH_STATE = {
  loginAttempts: 0,
  lastAttemptTime: 0,
  lockoutTime: 0,
  sessionTimeout: null,
  inactivityTime: 15 * 60 * 1000, // 15 minutes
  lastActivityTime: Date.now()
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Validate username format
 */
function validateUsername(u) {
  if (!u) return { valid: false, msg: 'Username is required' };
  if (u.length < 3) return { valid: false, msg: 'Username must be at least 3 characters' };
  if (!/^[a-z0-9_-]+$/.test(u)) return { valid: false, msg: 'Username can only contain letters, numbers, - and _' };
  return { valid: true };
}

/**
 * Validate password format
 */
function validatePassword(p) {
  if (!p) return { valid: false, msg: 'Password is required' };
  if (p.length < 6) return { valid: false, msg: 'Password must be at least 6 characters' };
  return { valid: true };
}

/**
 * Check if account is locked due to too many failed attempts
 */
function isAccountLocked() {
  if (AUTH_STATE.lockoutTime > Date.now()) {
    const remaining = Math.ceil((AUTH_STATE.lockoutTime - Date.now()) / 1000);
    return { locked: true, remaining };
  }
  return { locked: false };
}

/**
 * Record failed login attempt
 */
function recordFailedAttempt() {
  AUTH_STATE.loginAttempts++;
  AUTH_STATE.lastAttemptTime = Date.now();
  
  // Lock account after max attempts
  if (AUTH_STATE.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    AUTH_STATE.lockoutTime = Date.now() + LOCKOUT_DURATION;
    return {
      failed: true,
      locked: true,
      msg: 'Too many failed attempts. Account locked for 5 minutes.'
    };
  }
  
  return {
    failed: true,
    locked: false,
    remaining: MAX_LOGIN_ATTEMPTS - AUTH_STATE.loginAttempts,
    msg: `Invalid credentials. ${MAX_LOGIN_ATTEMPTS - AUTH_STATE.loginAttempts} attempt(s) remaining.`
  };
}

/**
 * Reset login attempts on successful login
 */
function resetLoginAttempts() {
  AUTH_STATE.loginAttempts = 0;
  AUTH_STATE.lastAttemptTime = 0;
  AUTH_STATE.lockoutTime = 0;
}

/**
 * Attempt login with username and password
 */
async function doLogin() {
  // Check if account is locked
  const lockCheck = isAccountLocked();
  if (lockCheck.locked) {
    showLoginError(`Account locked. Try again in ${lockCheck.remaining} seconds.`);
    return;
  }
  
  // Get and validate input
  const u = $('#lkUser').value.trim().toLowerCase();
  const p = $('#lkPass').value;
  const rememberMe = $('#lkRemember') && $('#lkRemember').checked;
  
  // Validate input format
  const userVal = validateUsername(u);
  if (!userVal.valid) {
    showLoginError(userVal.msg);
    return;
  }
  
  const passVal = validatePassword(p);
  if (!passVal.valid) {
    showLoginError(passVal.msg);
    return;
  }
  
  const acc = S.users.find((x) => x.u === u);

  // An unknown username must cost the same as a wrong password, or the delay
  // tells an attacker which usernames exist.
  if (!acc) await pwDerive(p, PW_DUMMY_SALT, PW_ITER);

  // pwVerify upgrades a record that still holds a readable password, but only
  // when the password given is the right one
  const ok = acc ? await pwVerify(acc, p) : false;

  if (!ok) {
    const attempt = recordFailedAttempt();
    showLoginError(attempt.msg);

    // Log failed attempt
    logIt('login_failed', `Failed login attempt for user: ${u}`, 'all', {
      attempts: AUTH_STATE.loginAttempts,
      locked: attempt.locked
    });

    $('#lkPass').value = '';
    $('#lkPass').focus();
    return;
  }

  // Checked only after the password is known to be right, so that a wrong
  // password cannot be used to discover which accounts are deactivated
  if (acc.active === 0) {
    showLoginError('This account has been deactivated. Ask a manager to re-enable it.');
    logIt('login_failed', `Sign-in refused, account deactivated: ${u}`, 'all', { user: u });
    $('#lkPass').value = '';
    return;
  }

  // Clear error
  hideLoginError();
  
  // Clear inputs
  $('#lkPass').value = '';
  $('#lkUser').value = '';
  
  // Reset attempt counter
  resetLoginAttempts();
  
  // Log successful login
  logIt('login', `User logged in: ${acc.name} (${acc.role})`, 'all', {
    user: acc.u,
    role: acc.role,
    site: acc.site
  });
  
  // Enter application
  enter(acc, rememberMe);
}

/**
 * Show login error message
 */
function showLoginError(msg) {
  const e = $('#lkErr');
  e.textContent = msg;
  e.classList.remove('hide');
}

/**
 * Hide login error message
 */
function hideLoginError() {
  const e = $('#lkErr');
  e.classList.add('hide');
  e.textContent = '';
}

/**
 * Start session timeout tracking
 */
function startSessionTimeout() {
  if (AUTH_STATE.sessionTimeout) {
    clearTimeout(AUTH_STATE.sessionTimeout);
  }
  
  AUTH_STATE.lastActivityTime = Date.now();
  
  AUTH_STATE.sessionTimeout = setTimeout(() => {
    if (VIEW.user) {
      logIt('session_timeout', 'Session timed out due to inactivity', 'all');
      showTimeoutWarning();
    }
  }, AUTH_STATE.inactivityTime);
}

/**
 * Reset inactivity timer on user activity
 */
function resetInactivityTimer() {
  if (!VIEW.user) return; // Not logged in
  
  const now = Date.now();
  if (now - AUTH_STATE.lastActivityTime > 60000) { // Only reset if > 1 minute since last activity
    AUTH_STATE.lastActivityTime = now;
    startSessionTimeout();
  }
}

/**
 * Show session timeout warning
 */
function showTimeoutWarning() {
  confirmModal(
    'Session Expired',
    'Your session has timed out due to inactivity. Please log in again.',
    () => signOut()
  );
}

/**
 * Enter the application with a user account
 */
function enter(acc, rememberMe = false) {
  VIEW.user = acc;

  // An account tied to exactly one warehouse opens on it; otherwise "all",
  // which mySiteIds() already narrows to the warehouses it may reach.
  const ids = siteIdsFor(acc);
  VIEW.site = ids.length === 1 ? ids[0] : 'all';
  VIEW.page = landingPage();
  
  // Store session info
  S.session = {
    u: acc.u,
    at: Date.now(),
    rememberMe: rememberMe
  };
  
  // Update UI
  $('#lock').classList.add('gone');
  $('#app').classList.add('on');
  
  // Set user badge
  const initials = acc.name
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  $('#meBtn').textContent = initials;
  $('#meBtn').title = acc.name;
  
  // Build navigation
  buildSites();
  buildNav();
  render();
  
  // Save state with remember-me
  if (rememberMe) {
    S.session.rememberMe = true;
    lsSet(REMEMBER_KEY, 'true');
  }
  saveState();
  
  // Initialize session tracking
  initSessionTracking();
  
  toast(`Welcome, ${acc.name}!`, 'good');
}

/**
 * Sign out
 */
function signOut() {
  if (VIEW.user) {
    // End session tracking
    endSession();
    
    // Log sign out
    logIt('logout', `User logged out: ${VIEW.user.name}`, 'all', {
      user: VIEW.user.u,
      duration: Date.now() - S.session.at
    });
  }
  
  // Close any open modals/menus
  closeMenu();
  closeModal();
  
  // Clear session
  VIEW.user = null;
  S.session = null;
  lsDel(REMEMBER_KEY);

  // Save state. VIEW.user is already null, so saveState() clears S.session too.
  saveState();

  // Update UI
  $('#app').classList.remove('on');
  $('#lock').classList.remove('gone');
  
  // Update clock
  tick();
  
  // Clear inputs
  $('#lkUser').value = '';
  $('#lkPass').value = '';
  hideLoginError();
  
  // Focus on username field
  setTimeout(() => {
    $('#lkUser').focus();
  }, 300);
  
  toast('You have been signed out', 'info');
}

/**
 * Change password modal
 */
function pwModal() {
  openModal(
    'Change Password',
    'Update your account password',
    `
      <div class="fld">
        <label>Current Password</label>
        <input type="password" id="pwCur" placeholder="Enter current password" autocomplete="current-password">
        <div class="hlp">Required for security verification</div>
      </div>
      <div class="fld">
        <label>New Password</label>
        <input type="password" id="pwNew" placeholder="Enter new password (min. 6 characters)" autocomplete="new-password">
        <div class="hlp">At least 6 characters recommended</div>
      </div>
      <div class="fld">
        <label>Confirm New Password</label>
        <input type="password" id="pwCon" placeholder="Confirm new password" autocomplete="new-password">
        <div class="hlp">Must match new password</div>
      </div>
    `,
    `
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn pri" onclick="changePassword()">Update Password</button>
    `
  );
  
  // Focus first field
  setTimeout(() => $('#pwCur').focus(), 100);
  
  // Allow Enter to submit
  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      changePassword();
    }
  };
  
  $('#pwCur').addEventListener('keydown', handleEnter);
  $('#pwNew').addEventListener('keydown', handleEnter);
  $('#pwCon').addEventListener('keydown', handleEnter);
}

/**
 * Validate new password strength
 */
function validateNewPassword(p) {
  if (!p) return { valid: false, msg: 'Password is required' };
  if (p.length < 6) return { valid: false, msg: 'Password must be at least 6 characters' };
  
  // Optional: check for complexity
  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasNum = /[0-9]/.test(p);
  
  if (!(hasUpper && hasLower && hasNum)) {
    console.warn('Weak password: mix of uppercase, lowercase, and numbers recommended');
  }
  
  return { valid: true };
}

/**
 * Process password change
 */
async function changePassword() {
  const cur = $('#pwCur').value;
  const neu = $('#pwNew').value;
  const con = $('#pwCon').value;

  // Validate current password
  const curUser = S.users.find((x) => x.u === VIEW.user.u);
  if (!curUser || !(await pwVerify(curUser, cur))) {
    toast('Current password is incorrect', 'bad');
    $('#pwCur').focus();
    return;
  }

  // Validate new password
  const newVal = validateNewPassword(neu);
  if (!newVal.valid) {
    toast(newVal.msg, 'bad');
    $('#pwNew').focus();
    return;
  }
  
  // Check passwords match
  if (neu !== con) {
    toast('New passwords do not match', 'bad');
    $('#pwCon').focus();
    return;
  }
  
  // Check new password is different from old
  if (neu === cur) {
    toast('New password must be different from current password', 'bad');
    $('#pwNew').focus();
    return;
  }
  
  // Update password. VIEW.user is the same object as the S.users entry, so
  // this updates both.
  const user = S.users.find((x) => x.u === VIEW.user.u);
  if (user) {
    await pwSet(user, neu);
    await saveState();

    // Log password change
    logIt('password_changed', `User changed password: ${VIEW.user.name}`, 'all', {
      user: VIEW.user.u
    });
    
    closeModal();
    toast('Password updated successfully', 'good');
  }
}

/**
 * Help under the sign-in form.
 *
 * The setup credential is deliberately not printed here. A device that opens
 * this file joins the shared store and receives its real accounts, so whoever
 * reaches this screen either has an account already or needs a manager to
 * create one -- printing the shipped password would simply hand it to anyone
 * who opened the link. The reset stays, because otherwise a forgotten password
 * leaves the app unusable on that device.
 */
function lockHint() {
  const box = $('#lkHint');
  if (!box) return;

  box.innerHTML = `
    <button type="button" class="lk-hint-a" onclick="resetDevice()">Trouble signing in?</button>
  `;
  box.classList.remove('hide');
}

/**
 * Clear this device's copy and start over. The store lives only in this
 * browser, so this is the way back in when nobody can sign in.
 */
function resetDevice() {
  openModal('Reset this device', 'Start again from the shipped account', `
    <p style="font-size:13.5px;margin:0 0 10px">
      This clears the copy of the store held in <b>this browser</b> and starts
      again from the shipped manager account and the sample data.
    </p>
    <p style="font-size:13px;color:var(--ink2);margin:0">
      Accounts, stock, tools, orders and history saved on this device are
      removed. Anything already written to your Google Sheet is not affected and
      comes back on the next sync. Other people's devices are untouched.
    </p>
  `, `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn dgr" onclick="doResetDevice()">Reset this device</button>
  `);
}

/**
 * Wipe local storage and reload into a fresh store
 */
async function doResetDevice() {
  await dbClear();
  location.reload();
}

/**
 * Initialize authentication UI
 */
function initAuth() {
  // Update clock
  tick();
  
  // Login button
  $('#lkGo').onclick = doLogin;
  
  // Password show/hide toggle
  $('#lkEye').onclick = () => {
    const i = $('#lkPass');
    const s = i.type === 'password';
    i.type = s ? 'text' : 'password';
    $('#lkEye').textContent = s ? 'Hide' : 'Show';
  };
  
  // Keyboard navigation
  $('#lkUser').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#lkPass').focus();
  });
  
  $('#lkPass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });
  
  lockHint();

  // Check for remembered session
  const remembered = lsGet(REMEMBER_KEY) === 'true';
  if (remembered && S.session) {
    const user = S.users.find((u) => u.u === S.session.u);
    if (user) {
      // Pre-fill username
      $('#lkUser').value = user.u;
      if ($('#lkRemember')) {
        $('#lkRemember').checked = true;
      }
      $('#lkPass').focus();
    }
  }
}
