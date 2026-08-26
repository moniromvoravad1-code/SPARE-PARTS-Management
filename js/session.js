/**
 * js/session.js - Session management and user tracking
 */

const SESSION_CONFIG = {
  inactivityTimeout: 15 * 60 * 1000, // 15 minutes
  warningTime: 2 * 60 * 1000, // Show warning 2 minutes before timeout
  maxSessionDuration: 8 * 60 * 60 * 1000, // 8 hours max session
  enableTracking: true
};

let SESSION_DATA = {
  startTime: null,
  lastActivityTime: null,
  warningShown: false,
  inactivityTimer: null,
  warningTimer: null,
  trackingEvents: []
};

/**
 * Initialize session tracking
 */
function initSessionTracking() {
  if (!SESSION_CONFIG.enableTracking || !VIEW.user) return;
  
  SESSION_DATA.startTime = Date.now();
  SESSION_DATA.lastActivityTime = Date.now();
  SESSION_DATA.warningShown = false;
  SESSION_DATA.trackingEvents = [];
  
  // Track user activity
  setupActivityTracking();
  
  // Log session start
  logIt('session_start', `Session started for ${VIEW.user.name}`, 'all', {
    user: VIEW.user.u,
    role: VIEW.user.role,
    site: VIEW.site
  });
}

/**
 * Setup activity tracking
 */
function setupActivityTracking() {
  const trackActivity = () => {
    SESSION_DATA.lastActivityTime = Date.now();
    SESSION_DATA.warningShown = false;
    resetInactivityTimers();
  };
  
  // Events that count as activity
  document.addEventListener('click', trackActivity);
  document.addEventListener('keydown', trackActivity);
  document.addEventListener('mousemove', trackActivity);
  document.addEventListener('scroll', trackActivity);
  
  // Start inactivity timers
  resetInactivityTimers();
}

/**
 * Reset inactivity timers
 */
function resetInactivityTimers() {
  if (!VIEW.user) return;
  
  // Clear existing timers
  if (SESSION_DATA.inactivityTimer) clearTimeout(SESSION_DATA.inactivityTimer);
  if (SESSION_DATA.warningTimer) clearTimeout(SESSION_DATA.warningTimer);
  
  // Warning timer
  SESSION_DATA.warningTimer = setTimeout(() => {
    if (!SESSION_DATA.warningShown && VIEW.user) {
      SESSION_DATA.warningShown = true;
      showSessionWarning();
    }
  }, SESSION_CONFIG.inactivityTimeout - SESSION_CONFIG.warningTime);
  
  // Timeout timer
  SESSION_DATA.inactivityTimer = setTimeout(() => {
    if (VIEW.user) {
      logIt('session_timeout', 'Session timed out due to inactivity', 'all', {
        duration: Date.now() - SESSION_DATA.startTime,
        lastActivity: Date.now() - SESSION_DATA.lastActivityTime
      });
      signOut();
      toast('Your session has expired. Please log in again.', 'bad');
    }
  }, SESSION_CONFIG.inactivityTimeout);
}

/**
 * Show session warning
 */
function showSessionWarning() {
  const remaining = Math.ceil(SESSION_CONFIG.warningTime / 1000);
  
  toast(`Session will expire in ${remaining} seconds. Click to stay logged in.`, 'bad');
  
  // Make toast clickable to reset timer
  const toastEl = $('#toast');
  toastEl.style.cursor = 'pointer';
  toastEl.onclick = () => {
    SESSION_DATA.lastActivityTime = Date.now();
    SESSION_DATA.warningShown = false;
    resetInactivityTimers();
    toast('Session reset. You are still logged in.', 'good');
  };
}

/**
 * Get session duration
 */
function getSessionDuration() {
  if (!SESSION_DATA.startTime) return 0;
  return Date.now() - SESSION_DATA.startTime;
}

/**
 * Get inactivity time
 */
function getInactivityTime() {
  if (!SESSION_DATA.lastActivityTime) return 0;
  return Date.now() - SESSION_DATA.lastActivityTime;
}

/**
 * Format session duration for display
 */
function formatSessionDuration(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get session info
 */
function getSessionInfo() {
  if (!VIEW.user) return null;
  
  return {
    user: VIEW.user.name,
    role: VIEW.user.role,
    site: VIEW.site,
    startTime: SESSION_DATA.startTime,
    duration: getSessionDuration(),
    inactivityTime: getInactivityTime(),
    durationFormatted: formatSessionDuration(getSessionDuration()),
    inactivityFormatted: formatSessionDuration(getInactivityTime())
  };
}

/**
 * End session and log activity
 */
function endSession() {
  if (!VIEW.user) return;
  
  const duration = getSessionDuration();
  
  logIt('session_end', `Session ended for ${VIEW.user.name}`, 'all', {
    user: VIEW.user.u,
    duration: duration,
    durationFormatted: formatSessionDuration(duration)
  });
  
  // Clear timers
  if (SESSION_DATA.inactivityTimer) clearTimeout(SESSION_DATA.inactivityTimer);
  if (SESSION_DATA.warningTimer) clearTimeout(SESSION_DATA.warningTimer);
  
  SESSION_DATA = {
    startTime: null,
    lastActivityTime: null,
    warningShown: false,
    inactivityTimer: null,
    warningTimer: null,
    trackingEvents: []
  };
}

/**
 * Show session info modal
 */
function showSessionInfo() {
  if (!VIEW.user) return;
  
  const info = getSessionInfo();
  
  openModal(
    'Session Information',
    `${info.user} · ${info.role}`,
    `
      <div class="kv">
        <span>Duration</span>
        <b>${info.durationFormatted}</b>
      </div>
      <div class="kv">
        <span>Inactivity Time</span>
        <b>${info.inactivityFormatted}</b>
      </div>
      <div class="kv">
        <span>Current Site</span>
        <b>${siteName(info.site)}</b>
      </div>
      <div class="kv">
        <span>Session Start</span>
        <b>${fmtDT(info.startTime)}</b>
      </div>
      <div class="kv">
        <span>Session Timeout</span>
        <b>${formatSessionDuration(SESSION_CONFIG.inactivityTimeout)}</b>
      </div>
    `,
    `<button class="btn pri" onclick="closeModal()">Close</button>`
  );
}
