# Login & Logout Quick Start Guide

## Getting Started

### 1. Open the Application
Open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge).

You should see the **Lock Screen** with:
- SPARE PARTS MANAGEMENT SYSTEM logo
- Current date and time
- Login form

### 2. Starter Accounts

The app ships with a single account, used to set everything else up:

| Account | Username | Password | Role | Sees |
|------|----------|----------|------|--------|
| Store Manager | `manager` | `Snt1X6ePdYH6` | manager | Everything, incl. Activity Log and Settings |

This is the only account the app ships with, and its password is readable in the
page source, so treat it as a setup key rather than a secret. Sign in as the
manager, change that password under your own account, then create the real team
under **Settings → Accounts**, where each person gets their own password,
assigned warehouses and module permissions.

Never commit real staff credentials to a shared repository — this repo is public.

### 3. Signing In
1. Type username: `manager`
2. Type password: `Snt1X6ePdYH6`
3. Click "Sign in" button

### 4. After Login
Once authenticated, you'll see:
- Navigation rail on the left
- Dashboard/home page
- User menu in top-right with session info
- App is fully functional

## Testing Authentication Features

### Feature 1: Login Validation

**Test: Required Fields**
1. Leave username empty, click "Sign in"
2. You'll see error: "Username required"
3. Leave password empty, click "Sign in"
4. You'll see error: "Password required"

**Test: Format Validation**
1. Try username "ab" (too short, needs 3+)
2. Error: "Username too short"
3. Try password "12345" (too short, needs 6+)
4. Error: "Password too short"

**Test: Invalid Credentials**
1. Enter: username `testuser`, password `wrongpass`
2. Error: "Invalid username or password"

### Feature 2: Account Lockout

**Test: Failed Attempts Limit**
1. Try logging in with wrong password 5 times:
   - Attempt 1: "Invalid credentials" error
   - Attempt 2: "Invalid credentials" error
   - Attempt 3: "Invalid credentials" error
   - Attempt 4: "Invalid credentials" error
   - Attempt 5: "Account locked. Try again in 300 seconds."
2. Account is now locked for 5 minutes
3. All attempts are logged (check Activity Log after login)

**To Reset Lockout (for testing)**:
- Clear browser's IndexedDB data
- Or wait 5 minutes
- Or open Developer Tools → Storage → IndexedDB and clear

### Feature 3: Remember Me

**Test: Enable Remember Me**
1. Check the "Remember me on this device" checkbox
2. Login as any user (e.g., manager/pwd)
3. Close the browser completely (or open DevTools → Storage → Clear All)
4. Refresh the page
5. **Expected**: Auto-login and appear on dashboard
6. Session continues without entering credentials

**Test: Disable Remember Me**
1. Don't check "Remember me"
2. Login and close browser
3. Refresh page
4. **Expected**: See login screen - must login again

### Feature 4: Session Timeout

**Test: Inactivity Timeout (15 minutes)**
1. Login as any user
2. Wait and do nothing (don't click or move mouse)
3. After 13 minutes: A warning toast appears
4. Click the warning toast to reset the timer
5. After 15 minutes of total inactivity (if you didn't click): Auto-logout
6. **Expected**: Session expires and logged out
7. Check Activity Log for `session_timeout` event

**Quick Test (simulate 15 min)**:
- This requires waiting, so for testing purposes:
- Edit `js/session.js` and change `inactivityTimeout` to `30000` (30 seconds)
- Then wait 30 seconds without interacting
- Session should timeout and show error

### Feature 5: Session Warning

**Test: Timeout Warning (appears 2 minutes before)**
1. Login and wait 13 minutes (with 30-second timeout: 28 seconds)
2. A toast notification appears saying session will expire
3. **Click the toast** to continue session
4. Timer resets and session continues
5. If you don't click, auto-logout after 2 more minutes

### Feature 6: Session Information

**To View Session Info**:
1. Login to the app
2. Click the **user menu icon** (top-right corner)
3. Select **"📊 Session info"**
4. A modal shows:
   - Session duration (how long logged in)
   - Inactivity time (time since last action)
   - Current site
   - Session start time
   - Session timeout setting (15 minutes)

### Feature 7: Sign Out

**Test: Manual Logout**
1. Click user menu (top-right)
2. Click **"⏻ Sign out"** button
3. **Expected**:
   - Auto-logout and return to login screen
   - Session duration logged in Activity Log
   - Toast shows "You have been signed out"
   - Form fields cleared
   - Cursor focused on username field

### Feature 8: Change Password

**Test: Password Change**
1. Login as any user
2. Click user menu (top-right)
3. Select **"⚿ Change password"**
4. Modal appears with:
   - Current password field (with autocomplete)
   - New password field (with help text)
5. Enter current password: `pwd`
6. Enter new password: `newpass123`
7. Click "Change"
8. **Expected**: Success message, change logged in Activity Log

**Test: Invalid Current Password**
1. Try change password
2. Enter wrong current password
3. Error: "Current password incorrect"

**Test: Password Too Short**
1. Try change password with new password "short"
2. Error: "New password too short (min 6)"

**Test: Same as Old Password**
1. Try to change password to same as current
2. Error: "Cannot use previous password"

## Testing with Different Roles

### Manager Role
- **Login**: username `manager`, password `pwd`
- **Permissions**: Full access to all pages
- **Features**: Can access Settings (⚙ icon in menu)

### Storekeeper Role
- **Login**: username `store`, password `pwd`
- **Permissions**: Can manage parts, view tools, limited admin
- **Features**: Inventory management

### Technician Role
- **Login**: username `tech`, password `pwd`
- **Permissions**: Tool checkout, calibration, parts view-only
- **Features**: Cannot modify settings

### Guest Role
- **Login**: username `guest`, password `pwd`
- **Permissions**: View-only for most pages
- **Features**: Can view logs and reports only

## Checking the Activity Log

All login/logout/session events are logged:

**To View Activity Log**:
1. Login as manager
2. Click user menu → **"≡ Activity log"**
3. You'll see entries like:
   - `login_attempt`: Each login try
   - `logout`: Each logout with duration
   - `session_timeout`: If session timed out
   - `password_change`: If you changed password

## Simulating Production Scenarios

### Scenario 1: User Leaves Computer
1. Login to app
2. Don't interact for 15 minutes
3. Auto-logout occurs
4. Next user must login fresh
5. Previous session logged with duration

### Scenario 2: Shared Device
1. User A logs in with "Remember me" checked
2. User A closes browser
3. User B opens browser - User A auto-logs in
4. User B can view User A's session (create new login)
5. User B logs in and "Remember me" as User B

### Scenario 3: Suspicious Activity
1. Attacker tries to login 5+ times with wrong password
2. Account gets locked automatically
3. Owner sees lockout event in logs
4. Owner waits 5 min or resets account
5. Legitimate user can login again

### Scenario 4: Session Lock
1. User takes break but stays at computer
2. Even if idle, can click warning toast to continue
3. Session stays active as long as user clicks toast
4. Prevents forced logout during meetings/calls

## Keyboard Shortcuts

### On Login Screen
- **Enter key**: Submit login form
- **Ctrl+K**: Open command palette (if enabled)
- **Tab**: Navigate between fields

### On Main App
- **Alt+Q**: Quick logout (if enabled)
- **Alt+L**: Go to activity log
- **Alt+U**: Open user menu

## Troubleshooting

### "Invalid username or password" appears but credentials look correct
- Check for leading/trailing spaces
- Demo password is: `pwd` (exactly)
- Username is case-sensitive

### Account locked for 5 minutes
- Either wait 5 minutes
- Or clear IndexedDB in browser developer tools
- Or try a different user

### Remember me not working
- Check if cookies/storage enabled in browser
- Verify private browsing is disabled
- Check if localStorage is available

### Session doesn't timeout
- Verify `js/session.js` loaded correctly
- Check browser console for errors
- Verify inactivity events being tracked

### Can't see Activity Log
- Must be logged in as manager or storekeeper role
- Guest role cannot access logs
- Check user menu → "≡ Activity log"

## Security Testing Checklist

- [ ] Test invalid credentials
- [ ] Test account lockout (5 attempts)
- [ ] Test session timeout (15 min inactivity)
- [ ] Test password change
- [ ] Test remember-me functionality
- [ ] Test multiple users on same device
- [ ] Test activity logging
- [ ] Test session info display
- [ ] Test sign out
- [ ] Test concurrent sessions
- [ ] Test browser refresh during session
- [ ] Test localStorage clearing

## Next Steps

After testing authentication:

1. **Customize for Your Needs**
   - Modify timeout duration in `js/session.js`
   - Adjust lockout attempts in `js/auth.js`
   - Change demo users in `js/config.js`

2. **Implement Backend Integration**
   - Replace demo users with backend API
   - Add real authentication server
   - Implement token-based auth (JWT)

3. **Add More Security**
   - Two-factor authentication (2FA)
   - Biometric login
   - IP whitelisting
   - Geo-blocking

4. **Customize UI**
   - Change logo and branding
   - Adjust colors in `css/variables.css`
   - Add company messaging

5. **Deploy**
   - Test on production server
   - Enable HTTPS
   - Configure backend
   - Setup database
