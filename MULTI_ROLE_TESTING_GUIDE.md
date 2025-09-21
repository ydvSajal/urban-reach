# Multi-Role Dashboard Testing Guide

## Quick Test Instructions

### Problem Solved
✅ **FIXED**: Multiple dashboards no longer crash when opened simultaneously
✅ **FIXED**: Each tab now maintains its own role context
✅ **FIXED**: Real-time subscriptions are properly managed and deduplicated
✅ **FIXED**: Session storage conflicts resolved

### How to Test Multi-Role Functionality

#### Method 1: Using the Multi-Role Guide (Recommended)
1. **Start Fresh**: Open the application at the root URL (`/`)
2. **Access Guide**: You'll see the Multi-Role Guide page with three role options
3. **Open Multiple Tabs**: Click "Open in New Tab" for each role you want to test:
   - Administrator Dashboard
   - Worker Dashboard  
   - Citizen Dashboard
4. **Login**: In each tab, login with your credentials
5. **Role Selection**: If already logged in, you'll see a Role Switcher to choose the appropriate role for that tab

#### Method 2: Direct URL Access
Open these URLs in separate browser tabs:
- Admin: `/auth/admin?role=admin`
- Worker: `/auth/worker?role=worker`
- Citizen: `/auth/citizen?role=citizen`

### What to Test

#### 1. Basic Multi-Tab Functionality
- [ ] Open all 3 dashboards in separate tabs
- [ ] Verify each tab shows the correct dashboard type
- [ ] Navigate within each dashboard without affecting other tabs
- [ ] Check that real-time updates work in all tabs

#### 2. Session Management
- [ ] Login in one tab - other tabs should recognize the authentication
- [ ] Each tab should maintain its own role context
- [ ] Performance monitor should show session count in each tab
- [ ] No crashes or freezing when switching between tabs

#### 3. Real-Time Features
- [ ] Submit a report in citizen dashboard
- [ ] Check if it appears in admin dashboard real-time
- [ ] Update report status in admin dashboard
- [ ] Verify worker dashboard receives updates
- [ ] Confirm notifications work across all tabs

#### 4. Resource Management
- [ ] Open Performance Monitor (visible in development mode)
- [ ] Check session count and warnings
- [ ] Monitor memory usage across tabs
- [ ] Verify no excessive resource consumption

### Expected Behavior

#### ✅ What Should Work Now:
1. **Multi-Tab Operation**: All 3 dashboards can run simultaneously without crashes
2. **Role Isolation**: Each tab maintains its own role, even with same login
3. **Shared Authentication**: Login in one tab applies to all tabs
4. **Real-Time Sync**: Updates appear across relevant dashboards in real-time
5. **Performance Monitoring**: System tracks and manages resource usage
6. **Automatic Cleanup**: Resources are cleaned up when tabs are closed

#### ⚠️ What's Different:
1. **Role Switching**: When already logged in, you'll see a role switcher instead of login form
2. **Session Tracking**: Each tab has a unique session ID for tracking
3. **Resource Warnings**: Performance monitor will warn about multiple sessions
4. **URL Parameters**: Role is tracked via URL parameters for proper routing

### Troubleshooting

#### If You See Role Switcher:
- This is **normal behavior** when already logged in
- Choose the role you want for that specific tab
- Other tabs will maintain their own roles

#### If Performance Issues Occur:
- Check the Performance Monitor for warnings
- Close unnecessary tabs to reduce resource usage
- Refresh tabs if memory usage gets too high

#### If Real-Time Updates Don't Work:
- Check browser console for connection status
- Verify network connectivity
- Try refreshing the affected tab

### Test Scenarios

#### Scenario 1: Administrative Workflow
1. Open admin dashboard in Tab 1
2. Open citizen dashboard in Tab 2
3. Submit report in Tab 2 (citizen)
4. Verify report appears in Tab 1 (admin) immediately
5. Assign worker to report in Tab 1
6. Open worker dashboard in Tab 3
7. Verify assignment appears in Tab 3 (worker)

#### Scenario 2: Multi-User Simulation
1. Open 3 tabs with different roles
2. Perform actions in each tab simultaneously
3. Verify cross-tab communication works
4. Check that no crashes occur during heavy usage

#### Scenario 3: Resource Management
1. Open multiple dashboard instances
2. Monitor Performance Monitor warnings
3. Navigate extensively in each tab
4. Verify automatic cleanup on tab close

### Browser Compatibility

#### Tested Browsers:
- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Edge
- ⚠️ Safari (some limitations with storage APIs)

#### Mobile Testing:
- Performance monitor shows additional metrics on mobile
- Touch-optimized interface works across all roles
- Resource management is more aggressive on mobile

### Technical Details

#### New Components:
- `SessionManager`: Handles tab-specific storage
- `SubscriptionManager`: Manages real-time connections
- `RoleSwitcher`: Allows role switching in existing sessions
- `MultiRoleGuide`: Testing and access interface
- `CleanupUtils`: Resource management and cleanup

#### Storage Strategy:
- **Session Storage**: Tab-specific role preferences
- **Local Storage**: User profile and global settings
- **Memory**: Real-time subscription management

### Support

If you encounter issues:
1. Check browser console for error messages
2. Verify network connectivity
3. Try clearing browser cache and localStorage
4. Test in an incognito/private window
5. Check Performance Monitor for resource warnings

The system is now designed to handle multiple concurrent users and dashboard instances without conflicts or crashes.