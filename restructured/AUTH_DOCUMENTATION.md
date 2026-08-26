# Authentication & Session Management Documentation

## Overview

The VoltGrid Store application includes a comprehensive authentication and session management system with advanced security features. This document covers all authentication workflows, security measures, and session management capabilities.

## File Structure

```
js/
├── auth.js              # Core authentication and login logic
├── session.js           # Session tracking and timeout management
└── config.js            # Authentication configuration and demo users
```

## Authentication Components

### 1. Auth Module (`js/auth.js`)

#### AUTH_STATE Object
Tracks all authentication and session state:

```javascript
AUTH_STATE = {
  loginAttempts: 0,           // Failed login attempt counter
  lastAttemptTime: 0,         // Timestamp of last failed attempt
  lockoutTime: 0,             // Timestamp when lockout was triggered
  sessionTimeout: null,       // Timer reference for session timeout
  inactivityTime: 15*60*1000, // 15 minute inactivity timeout
  lastActivityTime: Date.now()// Last user activity timestamp
}
```

#### Key Functions

##### `validateUsername(u)`
- Validates username format before login
- Requirements: 3+ characters, alphanumeric only
- Returns: boolean
- Example: `validateUsername('john123')` → true

##### `validatePassword(p)`
- Validates password format before login
- Requirements: 6+ characters minimum
- Returns: boolean
- Example: `validatePassword('secure123')` → true

##### `isAccountLocked()`
- Checks if account is currently locked due to failed attempts
- Returns: `{ locked: boolean, remaining: number }`
- Example: If locked, returns `{ locked: true, remaining: 120 }` (120 seconds remaining)

##### `recordFailedAttempt()`
- Records a failed login attempt
- Triggers 5-minute lockout after 5 failed attempts
- Tracks: attempt count, time of attempt, lockout time
- Called automatically by `doLogin()` on validation failure

##### `resetLoginAttempts()`
- Clears all failed attempt tracking
- Called after successful login
- Also called when lockout period expires

##### `doLogin()`
- Main login handler
- Workflow:
  1. Check if account is locked (if locked, show error)
  2. Validate username format
  3. Validate password format
  4. Find user in database
  5. Verify credentials
  6. On success: reset attempts, log in user
  7. On failure: record attempt, show error
- Logs all login attempts (success and failure)

##### `showLoginError(msg) / hideLoginError()`
- Display/hide error message on login form
- Used for: invalid credentials, account locked, validation failures

##### `enter(acc, rememberMe)`
- Finalizes login after credentials verified
- Parameters:
  - `acc`: User account object
  - `rememberMe`: boolean flag for remember-me functionality
- Actions:
  1. Set user in VIEW object
  2. Create session object with login timestamp
  3. If `rememberMe` = true: save to localStorage
  4. Initialize navigation and render app
  5. Setup session timeout tracking
  6. Show welcome toast
- Calls: `initSessionTracking()` to start timeout

##### `signOut()`
- Complete logout procedure
- Actions:
  1. End session tracking (calls `endSession()`)
  2. Log logout with session duration
  3. Clear session state
  4. Remove remember-me flag
  5. Close any open modals/menus
  6. Return to lock screen
  7. Clear form inputs
  8. Show logout confirmation

##### `pwModal()`
- Opens password change dialog
- Features:
  - Autocomplete for current password
  - Help text explaining requirements
  - Enter key support for submit
- Validation:
  - Current password must be correct
  - New password must meet strength requirements
  - New password cannot be same as old password
  - Minimum 6 characters, recommended 10+ for security

##### `validateNewPassword(p)`
- Validates new password strength
- Returns: `{ valid: boolean, message: string }`
- Checks:
  - Minimum 6 characters
  - Recommends 10+ characters
  - Suggests mixing uppercase, lowercase, numbers
- Example: `validateNewPassword('pass')` → `{ valid: false, message: "Too short..." }`

##### `changePassword()`
- Changes user password with validation
- Security checks:
  - Verify current password
  - Validate new password strength
  - Prevent password reuse
  - Log password change event
- Updates password in database

##### `initAuth()`
- Initializes authentication system on app startup
- Actions:
  1. Setup "Remember me" checkbox handling
  2. Setup keyboard navigation on login form
  3. Detect and restore remembered sessions
  4. Setup login form event handlers

### 2. Session Module (`js/session.js`)

#### SESSION_CONFIG Object
```javascript
SESSION_CONFIG = {
  inactivityTimeout: 15 * 60 * 1000,    // 15 minutes
  warningTime: 2 * 60 * 1000,           // Warn 2 min before timeout
  maxSessionDuration: 8 * 60 * 60 * 1000, // 8 hour max session
  enableTracking: true                  // Enable/disable tracking
}
```

#### Session Functions

##### `initSessionTracking()`
- Called after successful login
- Actions:
  1. Set session start time
  2. Set last activity time
  3. Setup activity event listeners
  4. Initialize inactivity timers
  5. Log session start event
- Events tracked: click, keydown, mousemove, scroll

##### `setupActivityTracking()`
- Attaches activity event listeners
- On any activity:
  1. Update `lastActivityTime`
  2. Reset warning state
  3. Reset inactivity timers
- Ensures timer resets every time user interacts

##### `resetInactivityTimers()`
- Resets session timeout counters
- Sets warning timer: expires 2 minutes before timeout
- Sets inactivity timer: expires after 15 minutes
- Called on every user activity

##### `showSessionWarning()`
- Displays warning when timeout approaching
- Shows toast with time remaining
- Click on toast resets timer and session
- Provides chance to continue working

##### `getSessionDuration()`
- Returns session duration in milliseconds
- Calculated: current time - session start time

##### `getInactivityTime()`
- Returns inactivity duration in milliseconds
- Calculated: current time - last activity time

##### `formatSessionDuration(ms)`
- Formats milliseconds for display
- Format: "Xh Ym" or "Xm Ys" or "Xs"
- Example: `formatSessionDuration(3661000)` → "1h 1m"

##### `getSessionInfo()`
- Returns object with current session details:
  ```javascript
  {
    user: "John Doe",
    role: "manager",
    site: "Site001",
    startTime: 1699564800000,
    duration: 1800000,           // ms
    inactivityTime: 120000,       // ms
    durationFormatted: "30m",
    inactivityFormatted: "2m"
  }
  ```

##### `endSession()`
- Called on logout
- Actions:
  1. Log session end event
  2. Clear all timers
  3. Calculate and log session duration
  4. Reset session data

##### `showSessionInfo()`
- Opens modal displaying current session information
- Shows: duration, inactivity time, start time, site, timeout setting

## Security Features

### Login Attempt Limiting
- **Max Attempts**: 5 failed login attempts
- **Lockout Duration**: 5 minutes
- **Mechanism**:
  - Counter increments on validation failure
  - After 5 attempts, account locked for 5 minutes
  - All attempts logged for audit
  - Counter resets on successful login or after lockout expires

### Session Timeout
- **Timeout Duration**: 15 minutes of inactivity
- **Warning Time**: 2 minutes before timeout
- **Inactivity Events Tracked**:
  - Mouse click
  - Keyboard input
  - Page scroll
  - Any DOM manipulation
- **Timeout Behavior**:
  1. Session timeout warning shown
  2. User can click to reset timer
  3. If no activity, auto-logout after 2 more minutes

### Password Security
- **Minimum Length**: 6 characters
- **Recommended Length**: 10+ characters
- **Validation Rules**:
  - Prevents old password reuse
  - Suggests complexity (uppercase, lowercase, numbers)
  - Change history tracked in logs
- **Change Restrictions**:
  - Must verify current password first
  - Cannot change to previous password
  - All changes logged with timestamp

### Remember Me
- **Storage**: localStorage with flag `voltgrid_rememberMe`
- **Behavior**:
  - If enabled: username remembered across sessions
  - Auto-login attempt on app restart
  - Session restored from database
  - Still requires full session timeout/logout
- **Security Notes**:
  - Only uses public localStorage (no passwords stored)
  - Can be manually cleared or disabled
  - Session still expires after timeout

## Demo Users

Default demo users available (from config.js):

```javascript
DEMO_USERS = [
  { name: 'Manager Demo', u: 'manager', p: 'pwd', role: 'manager' },
  { name: 'Storekeeper', u: 'store', p: 'pwd', role: 'storekeeper' },
  { name: 'Technician', u: 'tech', p: 'pwd', role: 'tech' },
  { name: 'Guest', u: 'guest', p: 'pwd', role: 'guest' }
]
```

Quick login: Click any demo chip on login screen

## Audit & Logging

All authentication events are logged:

### Logged Events
- `login_attempt`: Each login try (success/failure)
- `login_failed`: Failed login with reason
- `auto_login`: Auto-login from remember-me
- `logout`: User logout with session duration
- `session_timeout`: Session expired due to inactivity
- `session_start`: Session initialized
- `session_end`: Session ended (for analytics)
- `password_change`: Password changed
- `password_change_failed`: Password change failed
- `account_locked`: Account locked due to attempts
- `lockout_expired`: Lockout period ended

### Log Entries Include
- Event type
- User identifier
- Timestamp
- Additional context (role, site, duration, etc.)

## Integration Points

### With Navigation
- User menu shows "Session info" option
- Shows current session duration and inactivity
- Provides logout button

### With Storage
- Session state persisted to IndexedDB
- User list stored in database
- Remember-me flag in localStorage
- Activity logs in database

### With UI
- Login form with validation
- Error message display
- Toast notifications for login/logout
- Modal for session timeout warning
- Modal for session info display

## Testing Login & Logout

### Test Scenarios

#### 1. Basic Login
1. Load application
2. See lock screen with demo user chips
3. Click any demo user chip (fills username/password)
4. Click "Sign in" button
5. App unlocks and shows dashboard

#### 2. Login Validation
1. Try empty username → "Username required"
2. Try "ab" username → "Username too short"
3. Try "user" with empty password → "Password required"
4. Try "user" with "12345" password → "Password too short"
5. Try "user" with "wrong_pass" → "Invalid username or password"

#### 3. Account Lockout
1. Login as "manager" with wrong password 5 times
2. After 5th attempt → "Account locked. Try again in 300 seconds."
3. Wait or manually reset (localStorage cleared)
4. Should be able to login again

#### 4. Remember Me
1. Check "Remember me on this device"
2. Login successfully
3. Refresh page (Ctrl+R or F5)
4. Should auto-login if within timeout period
5. Session continues without re-entering credentials

#### 5. Session Timeout
1. Login successfully
2. Do nothing for 13 minutes (approaching timeout)
3. At 15 minutes of inactivity → auto-logout
4. Toast shows "Session has expired"
5. Returned to lock screen

#### 6. Session Timeout Warning
1. Login successfully
2. Do nothing for 13 minutes
3. At 13 minute mark → warning toast appears
4. Click toast to reset timer
5. Timer resets and continues session

#### 7. Password Change
1. Login as any user
2. Click menu → "Change password"
3. Enter current password
4. Enter new password (10+ chars recommended)
5. Confirm new password matches
6. Password changed and logged

#### 8. Sign Out
1. Login successfully
2. Click user menu → "Sign out"
3. Logged out and returned to lock screen
4. Session duration logged
5. Form fields cleared
6. Focus on username field

## Configuration

### Modify Timeout Values
Edit `js/session.js`:

```javascript
SESSION_CONFIG = {
  inactivityTimeout: 20 * 60 * 1000, // Change to 20 minutes
  warningTime: 3 * 60 * 1000,        // Change to 3 minutes
  // ...
}
```

### Modify Lockout Settings
Edit `js/auth.js`:

```javascript
const MAX_LOGIN_ATTEMPTS = 5;        // Max attempts before lockout
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minute lockout
```

### Disable Remember Me
Edit `js/auth.js` `initAuth()`:

```javascript
// Comment out or remove remember-me checkbox setup
```

## Best Practices

1. **Security**
   - Always use HTTPS in production
   - Implement rate limiting on backend
   - Consider 2FA for sensitive roles
   - Regularly audit login logs

2. **User Experience**
   - Test timeout values match your workflow
   - Ensure warning time is sufficient
   - Consider "Lock" option instead of logout
   - Remember-me should be user's choice

3. **Maintenance**
   - Review and archive old logs regularly
   - Monitor for unusual login patterns
   - Update demo user credentials in production
   - Test security features on deployment

## Troubleshooting

### Remember Me Not Working
- Check localStorage is enabled
- Verify session hasn't expired
- Check browser privacy settings

### Timeout Not Working
- Verify `SESSION_CONFIG` in js/session.js
- Check event listeners are attached (see console)
- Ensure `initSessionTracking()` was called

### Password Change Failing
- Verify current password is correct
- Check new password meets minimum requirements
- Ensure password fields match
- Check IndexedDB for errors

### Session Not Persisting
- Verify `initStorage()` called successfully
- Check IndexedDB quota not exceeded
- Verify `S.session` object created
- Check browser IndexedDB settings

## Future Enhancements

- Two-factor authentication (2FA)
- Biometric authentication (fingerprint, face)
- Login activity dashboard
- Geo-location tracking
- Session lock (temporary auto-lock)
- Custom session timeout per role
- IP-based restrictions
- Device management
- OAuth/SSO integration
