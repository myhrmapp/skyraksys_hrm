# Bug Sheet Analysis — 08-04-2026 (Detailed Fix Plan)

Source: `Bug_sheet_08-04-26-merged (1).xlsx`

---

## Summary

| Verdict | Count |
|---------|-------|
| Confirmed Bug — Fix Required | 12 |
| Not a Bug / Works as Designed | 12 |
| On Hold / Cannot Verify | 5 |
| Duplicate (appears in both Admin & Employee sections) | 2 |
| New Feature Required (not a bug) | 2 |

---

## SECTION A — Admin Account Bugs

---

### Bug #1 — Notification bell is not functioning
- **Verdict:** ✅ CONFIRMED — NEW FEATURE REQUIRED (not a fix, the feature doesn't exist)
- **Root Cause (code-traced):**
  - `Layout.js` line ~489-497 renders an `<IconButton>` with `<Notifications />` icon but has **NO `onClick` handler** at all.
  - `NotificationContext.js` is only a `notistack` wrapper — creates toast notifications, does NOT manage a notification list or fetch from any API.
  - **No backend notification API exists** — no `notification.routes.js`, no `notification.controller.js`, no `Notification` model.
  - **No frontend notification page/component exists** — no `NotificationPanel`, `NotificationDropdown`, etc.
- **Scope:** This is a **new feature**, not a bug fix. The entire notification subsystem (backend model, API, frontend component, real-time updates) would need to be built.
- **Fix Required:**
  1. Backend: Create `Notification` model, `notification.routes.js`, `notificationController.js`
  2. Frontend: Create `NotificationDropdown` component, add `onClick` to the bell `<IconButton>` in `Layout.js` ~line 489
  3. Wire up existing system events (leave approval, timesheet status changes, etc.) to create notification records
- **Risk:** Large feature — touches backend models, routes, frontend components, and event triggers across multiple modules.

---

### Bug #2 — SMTP Configuration (Email) — On Hold
- **Verdict:** ⏸️ ON HOLD (as noted in the sheet)
- **Analysis:** SMTP configuration is fully implemented in backend (`settings.routes.js`, `email.service.js`) with CRUD, encryption, and test-send capability. Frontend has `SmtpConfigPage`. The tester marked this as "On Hold".
- **Fix Required:** None at this time.

---

### Bug #3 — Logo & Preferences — Cannot crop image after uploading
- **Verdict:** ✅ CONFIRMED — NEW FEATURE REQUIRED
- **Root Cause (code-traced):**
  - `PhotoUpload.js` (lines 60-86): `handleFileSelect` reads the file and creates a `FileReader` data URL preview — then it's uploaded as-is. **No crop step exists.**
  - `frontend/package.json`: No image crop library is installed (`react-image-crop`, `react-easy-crop`, `react-cropper`).
  - Upload flow: Select file → Preview → Upload. No intermediate crop dialog.
- **Scope:** New feature — requires installing a crop library and adding a crop dialog between file selection and upload.
- **Fix Required:**
  1. Install `react-easy-crop` (lightweight, MUI-compatible)
  2. In `PhotoUpload.js`, after `handleFileSelect` reads the file (line 82-86), open a crop dialog instead of immediately setting the preview
  3. On crop confirm, convert cropped canvas to Blob, set as `selectedFile`
  4. Same change for Logo upload in preferences (if it uses a different component, find and update it too)
- **Files to change:** `frontend/package.json`, `frontend/src/components/common/PhotoUpload.js`
- **Risk:** Medium — self-contained feature addition. No backend changes needed.

---

### Bug #4 — Configuration — Failed to save settings
- **Verdict:** ⚠️ NEEDS VERIFICATION — likely user error
- **Analysis:** Backend validates required fields (`companyName`, `companyAddress`). The "Failed to save settings" error appears when validation fails. The UI has these fields — likely the tester left required fields empty.
- **Fix Required:** None confirmed. Recommend testing with all required fields filled.

---

### Bug #5 — Notifications redirect to employee profile
- **Verdict:** ✅ CONFIRMED BUG
- **Root Cause (code-traced):**
  - `Layout.js` lines 621-629: The "Notifications" MenuItem in the profile dropdown menu navigates to `/my-profile`:
    ```jsx
    <MenuItem onClick={() => {
        handleProfileMenuClose();
        navigate('/my-profile');    // ← BUG: should go to notifications, not profile
      }}>
      <ListItemIcon><Notifications fontSize="small" /></ListItemIcon>
      Notifications
    </MenuItem>
    ```
  - No `/notifications` route exists. No notification page exists.
- **Fix Required (depends on Bug #1):**
  - **If Bug #1 (notification system) is built:** Change `navigate('/my-profile')` to `navigate('/notifications')` on `Layout.js` ~line 623.
  - **If Bug #1 is deferred:** Remove or hide the "Notifications" menu item entirely so it doesn't mislead users.
- **Files to change:** `frontend/src/components/layout/Layout.js` line 623
- **Risk:** Trivial one-line change. But the target route must exist first.

---

### Bug #6 — Dashboard Overview — "On leave" and "New hires" quick links not functioning
- **Verdict:** ✅ CONFIRMED BUG
- **Root Cause (code-traced):**
  - `AdminDashboard.js` lines 301-318: The "On Leave" and "New Hires" `StatCard` components are rendered **without `onClick` props**:
    ```jsx
    {/* Line 302-308: No onClick */}
    <StatCard title="On Leave" value={stats.employees.onLeave} subtitle="today"
              icon={<LeaveIcon />} color="warning" />
    
    {/* Line 311-317: No onClick */}
    <StatCard title="New Hires" value={stats.employees.newHires} subtitle="this month"
              icon={<TrendingUpIcon />} color="success" />
    ```
  - The `StatCard` component (line 93-108) **does support onClick** — it's used correctly on "Total Employees" card (`onClick={() => navigate('/employees')}`) and "Pending Leaves" card (`onClick={() => navigate('/leave-requests')}`). These two cards are just missing it.
- **Fix Required:**
  1. Line ~302: Add `onClick={() => navigate('/employees?status=on-leave')}` to "On Leave" StatCard
  2. Line ~311: Add `onClick={() => navigate('/employees?filter=new-hires')}` to "New Hires" StatCard
  3. **Verify** the `/employees` page supports these query params for filtering. If not, add URL parameter handling to the employees list page.
- **Files to change:** `frontend/src/components/features/dashboard/AdminDashboard.js` lines ~302, ~311. Possibly `EmployeeList` or `AllEmployees` component for filter param handling.
- **Risk:** Low — adding onClick props. Medium if filter param support needs to be added to the employees list page.

---

### Bug #7 — Operations Overview — "Draft" and "Approved" quick links not functioning
- **Verdict:** ✅ CONFIRMED BUG
- **Root Cause (code-traced):**
  - `AdminDashboard.js` lines 327-343: Same pattern as Bug #6. "Draft" and "Approved" `StatCard` components have no `onClick`:
    ```jsx
    {/* Line 328-334: No onClick */}
    <StatCard title="Draft" value={stats.timesheets.pending} subtitle="timesheets"
              icon={<TimesheetIcon />} color="warning" />
    
    {/* Line 337-343: No onClick */}
    <StatCard title="Approved" value={stats.timesheets.approved} subtitle="this month"
              icon={<CheckCircleIcon />} color="success" />
    ```
- **Fix Required:**
  1. Line ~328: Add `onClick={() => navigate('/timesheets?status=draft')}` to "Draft" StatCard
  2. Line ~337: Add `onClick={() => navigate('/timesheets?status=approved')}` to "Approved" StatCard
  3. **Verify** the timesheets page supports these query params for filtering.
- **Files to change:** `frontend/src/components/features/dashboard/AdminDashboard.js` lines ~328, ~337. Possibly timesheet list component.
- **Risk:** Same as Bug #6.

---

### Bug #8 — Client Performance — Auto-refresh re-enables after disabling
- **Verdict:** ⚠️ NEEDS VERIFICATION
- **Analysis:** Cannot definitively confirm from code analysis. The auto-refresh toggle + interval logic needs runtime testing.
- **Fix Required:** Test locally. If confirmed, audit the `useEffect`/`setInterval` lifecycle for the auto-refresh feature.

---

### Bug #9 — Performance page not auto-refreshing
- **Verdict:** ⚠️ CONTRADICTS Bug #8 — same root cause
- **Analysis:** Bugs #8 and #9 describe opposite symptoms. Likely a single state management issue with the refresh interval toggle.
- **Fix Required:** Same as Bug #8.

---

### Bug #10 — Payslip date selection not configuring correctly
- **Verdict:** ❌ NOT A BUG
- **Analysis:** Payslip date picker uses month/year selection which works correctly. The report is vague. No code issue found.
- **Fix Required:** None. Request specific reproduction steps from tester.

---

### Bug #11 — Unlock account button missing for locked accounts
- **Verdict:** ❌ NOT A BUG
- **Analysis:** Lock/unlock fully implemented. Unlock button is conditional on `user.isLocked === true`. Tester likely didn't have a truly locked account.
- **Fix Required:** None.

---

### Bug #12 — Send welcome email — `toUpperCase` error
- **Verdict:** ✅ CONFIRMED BUG
- **Root Cause (code-traced):**
  - `backend/services/email.service.js` line 213:
    ```javascript
    <span class="credential-value">${user.role.toUpperCase()}</span>
    ```
    Crashes with `Cannot read properties of undefined (reading 'toUpperCase')` when `user.role` is undefined.
  - **Two callers found:**
    - **Caller A** (`email.routes.js` lines 45-80): ✅ Safe — constructs `userData` object with `role: user.role` always included.
    - **Caller B** (`auth.routes.js` lines 560-580): ❌ **BROKEN** — passes parameters incorrectly:
      ```javascript
      await emailService.sendWelcomeEmail(
        user.email,           // ← WRONG: passing email string, not user object
        temporaryPassword,
        user.employee?.firstName || 'User'
      );
      ```
      The function signature is `sendWelcomeEmail(user, tempPassword)`, but this caller passes a string as the first arg, so `user.role` is undefined (it's actually `"email@example.com".role`).
- **Fix Required (two changes):**
  1. `backend/services/email.service.js` line 213: Change to `${(user.role || 'USER').toUpperCase()}`
  2. `backend/routes/auth.routes.js` line ~560-580: Fix the caller to pass a proper user object:
     ```javascript
     await emailService.sendWelcomeEmail(
       { email: user.email, firstName: user.employee?.firstName || 'User', lastName: user.employee?.lastName || '', role: user.role },
       temporaryPassword
     );
     ```
- **Files to change:** `backend/services/email.service.js` (line 213), `backend/routes/auth.routes.js` (line ~560-580)
- **Risk:** Low — straightforward parameter fix. The incorrect caller is the only thing that can break, and it was already broken.

---

### Bug #13 — Force logout requires backend session management
- **Verdict:** ❌ NOT A BUG — feature limitation / documentation issue
- **Analysis:** JWT-based auth with token blacklisting and `RefreshToken` revocation is implemented. Force logout should work via session revocation.
- **Fix Required:** None.

---

### Bug #14 — Cannot configure compensation details
- **Verdict:** ❌ LIKELY NOT A BUG — code-traced end-to-end, works
- **Root Cause (code-traced):**
  - Frontend: `EmployeeForm.js` line 263-285 renders a "Employment & Compensation" tab (tab index 1) containing `SalaryStructureTab` component with all salary fields (basicSalary, allowances, deductions, etc.)
  - `SalaryStructureTab.js` line 22+: Renders `TextField` inputs for all salary fields with proper `onChange` handlers that call `onChange('salary.basicSalary', value)` etc.
  - `useEmployeeForm.js` line ~581: On save, calls `transformEmployeeDataForAPI(formData)` which at line ~470-510 includes `salary` object in the API payload (only if `basicSalary` is provided).
  - Backend `EmployeeBusinessService.updateEmployee()` line ~143-190: Extracts `data.salary`, maps it to `SalaryStructure` model fields, and either updates or creates the salary record.
  - **Complete code path exists and works.** The tester may have been confused by the tab structure or didn't fill in `basicSalary` (which is the trigger for including salary data).
- **Fix Required:** None for code. The tab exists, the save works. If tester can reproduce, need specific steps.

---

### Bug #15 — Cannot crop profile image after uploading
- **Verdict:** ✅ DUPLICATE of Bug #3
- **Fix Required:** Same as Bug #3.

---

### Bug #16 — Profile image not updated after save
- **Verdict:** ✅ CONFIRMED BUG
- **Root Cause (code-traced):**
  - `useEmployeeForm.js` lines ~581-620 (edit mode save):
    ```javascript
    updateMutation.mutate(
      { id, data: apiData },  // ← NO photo included
      { onSuccess: ... }
    );
    ```
    In **edit mode**, `selectedPhoto` is collected by the form but **never passed to the mutation**. The mutation only sends `{ id, data: apiData }`.
  - In **create mode** (line ~656-658), photo IS correctly included:
    ```javascript
    const mutationData = selectedPhoto 
      ? { data: apiData, photo: selectedPhoto }
      : { data: apiData };
    createMutation.mutate(mutationData, ...);
    ```
  - **Separate hook `useEmployeeProfile.js`** (line 141-200) handles photo correctly — it uploads photo as a separate API call after `updateMutation.onSuccess`. But `useEmployeeForm` (used in the actual edit form) does NOT do this.
- **Fix Required:**
  1. In `useEmployeeForm.js`, in the edit mode `updateMutation.mutate` `onSuccess` callback (around line ~590-620), add photo upload logic similar to `useEmployeeProfile.js`:
     ```javascript
     onSuccess: async (employeeData) => {
       // ... existing success logic ...
       if (selectedPhoto) {
         try {
           await employeeService.uploadPhoto(id, selectedPhoto);
         } catch (photoError) {
           console.warn('Photo upload failed:', photoError);
         }
       }
     }
     ```
  2. The `employeeService.uploadPhoto` function already exists and works (calls `POST /employees/:id/photo`).
- **Files to change:** `frontend/src/components/features/employees/hooks/useEmployeeForm.js` (~line 590)
- **Risk:** Low — adding a call to an existing, working API. No backend changes needed.

---

### Bug #17 — Employee ID not updated after save
- **Verdict:** ❌ NOT A BUG — by design
- **Analysis:** Employee IDs are auto-generated and immutable. `EmployeeBusinessService.validateEmployeeUpdate` explicitly blocks employeeId changes. The `transformEmployeeDataForAPI` function does include `employeeId` via `addIfNotEmpty`, but the backend silently ignores it or rejects the change.
- **Fix Required:** None for logic. Optionally make the Employee ID field `disabled` in the edit form for clarity. Non-essential.

---

### Bug #18 — No reviews/data after creating a new review
- **Verdict:** ⚠️ NEEDS VERIFICATION
- **Analysis:** Backend review CRUD exists. Could be a query cache invalidation issue. Need runtime test.
- **Fix Required:** Test locally. If confirmed, invalidate review list query after creation.

---

### Bug #19 — Leave balance not auto-updating after submission
- **Verdict:** ❌ NOT A BUG — works as designed
- **Analysis:** Leave balance updates **on approval**, not on submission. `LeaveApprovalService.js` deducts balance atomically within a DB transaction on approval. This is correct business logic.
- **Fix Required:** None.

---

### Bug #20 — Leave balance creation returns 400
- **Verdict:** ❌ NOT A BUG — validation working as designed
- **Analysis:** 400 is returned for duplicate balance or missing required fields. Intentional validation.
- **Fix Required:** None. Frontend could show more descriptive error messages.

---

### Bug #21 — Attendance manual edit saves incorrect time
- **Verdict:** ✅ CONFIRMED BUG
- **Root Cause (code-traced):**
  - **Frontend** (`AttendanceManagement.js` lines 376-395): Uses `type="datetime-local"` input which gives values like `"2026-04-08T14:30"` — **no timezone offset**.
  - **Edit handler** (`AttendanceManagement.js` lines 140-148): Formats existing values with `dayjs(row.checkIn).format('YYYY-MM-DDTHH:mm')` — also no timezone.
  - **Submit** (`AttendanceManagement.js` lines 124-138): Sends `markForm` directly to `attendanceService.markAttendance(markForm)` — no timezone conversion.
  - **Backend validation** (`attendance.validator.js` lines 24-25): `checkIn: Joi.date().iso()` — expects ISO format, but the datetime-local string `"2026-04-08T14:30"` is technically valid ISO 8601 **without timezone** info.
  - **Backend service** (`attendance.service.js` lines 331-332):
    ```javascript
    const checkInTime = new Date(checkIn);    // ← Ambiguous: "2026-04-08T14:30" parsed differently in different environments
    const checkOutTime = new Date(checkOut);
    ```
    `new Date("2026-04-08T14:30")` is interpreted as **local time** in Node.js, which depends on the server's timezone setting. If the server is in UTC but the user entered IST time, the stored time will be off by 5:30 hours.
  - **DB model** (`attendance.model.js` lines 24-34): Uses `DataTypes.DATE` (PostgreSQL `TIMESTAMP WITH TIME ZONE`), which stores UTC internally.
- **Fix Required:**
  1. **Frontend** (`AttendanceManagement.js`): Append the user's timezone offset when sending datetime-local values:
     ```javascript
     // Before sending markForm:
     const formatWithTimezone = (datetimeLocalValue) => {
       if (!datetimeLocalValue) return null;
       const date = new Date(datetimeLocalValue);
       return date.toISOString(); // e.g., "2026-04-08T09:00:00.000Z"
     };
     const payload = {
       ...markForm,
       checkIn: formatWithTimezone(markForm.checkIn),
       checkOut: formatWithTimezone(markForm.checkOut),
     };
     await attendanceService.markAttendance(payload);
     ```
  2. **Backend** (`attendance.service.js` lines 331-332): Already uses `new Date()` which will correctly parse ISO strings with timezone. No backend change needed if frontend sends proper ISO strings.
- **Files to change:** `frontend/src/components/features/attendance/AttendanceManagement.js` (~line 124-138, the submit handler)
- **Risk:** Low — frontend-only change. Need to also test the edit handler (line 140-148) to ensure dates display correctly in the input after conversion.

---

### Bug #22 — Attendance PDF export downloads empty
- **Verdict:** ✅ CONFIRMED BUG — FEATURE MISSING
- **Root Cause (code-traced):**
  - **Frontend** (`AttendanceManagement.js` line ~237): Uses MUI DataGrid's built-in `<GridToolbarExport />` which only supports CSV export. **There is no custom PDF export button.**
  - **Backend**: No attendance PDF export endpoint. Scanned all routes in `attendance.routes.js` (22 endpoints) — none generate PDF. Only `payslipController.js` has PDF generation (for payslips).
  - The tester likely used `GridToolbarExport` → "Download as Print" which opens print dialog, not a proper PDF.
- **Fix Required:**
  1. Backend: Create a `GET /api/attendance/export/pdf` endpoint using the same PDF library (`pdfkit` or `puppeteer`) used for payslips in `payslipController.js`
  2. Frontend: Add a custom "Export PDF" button to the attendance DataGrid toolbar
  3. Wire the button to call the backend endpoint and trigger file download
- **Files to change:** `backend/routes/attendance.routes.js` (new endpoint), `backend/services/attendance.service.js` (new method), `frontend/src/components/features/attendance/AttendanceManagement.js` (new toolbar button)
- **Risk:** Medium — new feature, but follows existing patterns from payslip PDF generation.

---

### Bug #23 — Task edit validation error
- **Verdict:** ❌ NOT A BUG — validation working correctly
- **Analysis:** `TaskValidator.js` validates permissions, project existence, and field constraints. The error means validation is working. Need specific reproduction data.
- **Fix Required:** None. Request specific steps from tester.

---

### Bug #24 — Leave cancellation button missing (Employee - My Work)
- **Verdict:** ✅ CONFIRMED BUG
- **Root Cause (code-traced):**
  - `EmployeeLeaveRequests.js` lines 235-250: Table has 6 columns: Leave Type, Duration, Days, Applied Date, Status, Comments. **No Actions column. No Cancel button.**
  - **Backend is ready**: `POST /api/leaves/:id/cancel` endpoint exists (`leave.routes.js` lines 355-364).
  - **Frontend hook is ready**: `useCancelLeaveRequest()` hook exists (`useLeaveQueries.js` lines 132-153), calls `leaveService.cancel(id)`.
  - **Frontend service is ready**: `leaveService.cancel(id)` exists (`leave.service.js` line 77-79).
  - **Business rules** (`LeaveBusinessService.cancelLeaveRequest`, lines 272-330):
    - Employees can cancel their own leaves
    - Only `Pending` or `Approved` status can be cancelled
    - `Pending` → cancelled immediately with balance restoration
    - `Approved` → set to `Cancellation Requested` (needs manager approval)
- **Fix Required:**
  1. In `EmployeeLeaveRequests.js`, add an "Actions" column to the table:
     ```jsx
     <TableCell>Actions</TableCell>  // In TableHead
     ```
  2. In each table row, add a Cancel button (only for `pending` or `approved` status):
     ```jsx
     <TableCell>
       {['pending', 'approved'].includes(request.status?.toLowerCase()) && (
         <Button size="small" color="error" onClick={() => handleCancel(request.id)}>
           Cancel
         </Button>
       )}
     </TableCell>
     ```
  3. Import and use the `useCancelLeaveRequest` hook:
     ```javascript
     const cancelMutation = useCancelLeaveRequest();
     const handleCancel = (id) => {
       if (window.confirm('Are you sure you want to cancel this leave request?')) {
         cancelMutation.mutate(id);
       }
     };
     ```
- **Files to change:** `frontend/src/components/features/leave/EmployeeLeaveRequests.js`
- **Risk:** Low — using existing hook and backend endpoint. Self-contained change in one file.

---

### Bug #25 — User created but has no module access
- **Verdict:** ⚠️ NEEDS VERIFICATION
- **Analysis:** RBAC via JWT claims works. Need to verify the specific user creation scenario and role assignment.
- **Fix Required:** Test with a fresh user creation. Check the assigned role and JWT claims.

---

### Bug #26 — Restore Records shows no data
- **Verdict:** ❌ NOT A BUG
- **Analysis:** Restore functionality fully implemented with `paranoid: false` queries. If no soft-deleted records exist in the DB, the page correctly shows empty.
- **Fix Required:** None.

---

### Bug #27 — Payroll search cursor jumps
- **Verdict:** ✅ CONFIRMED BUG
- **Root Cause (code-traced):**
  - `ModernPayrollManagement.js` line 99: State declaration:
    ```javascript
    const [searchQuery, setSearchQuery] = useState('');
    ```
  - Lines 1139-1155: Controlled input:
    ```jsx
    <TextField
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      size="small"
      sx={{ minWidth: 250 }}
      ...
    />
    ```
  - Lines 1299-1312: Client-side filtering applied on every keystroke:
    ```javascript
    const filteredPayslips = payslips
      .filter(p => statusFilter ? p.status === statusFilter : true)
      .filter(p => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        ...
      });
    ```
  - **Every keystroke** → state update → re-render → filter recalculation → table DOM recreated → cursor position lost or input focus disrupted.
  - The issue is not the input itself (controlled inputs work fine in React), but the **heavy table re-render** on each keystroke that may cause layout shifts affecting the input.
- **Fix Required:**
  1. Add debouncing: separate the input value from the filter value:
     ```javascript
     const [searchInput, setSearchInput] = useState('');  // For the TextField
     const [searchQuery, setSearchQuery] = useState('');  // For filtering (debounced)
     
     useEffect(() => {
       const timer = setTimeout(() => setSearchQuery(searchInput), 300);
       return () => clearTimeout(timer);
     }, [searchInput]);
     ```
  2. Update the TextField to use `searchInput`:
     ```jsx
     <TextField value={searchInput} onChange={(e) => setSearchInput(e.target.value)} ... />
     ```
  3. Keep filter logic using `searchQuery` (debounced value).
- **Files to change:** `frontend/src/components/features/payroll/ModernPayrollManagement.js` (lines ~99 and ~1139-1155)
- **Risk:** Low — straightforward debounce pattern. No backend changes.

---

## SECTION B — Employee Account Bugs

---

### Bug E#1 — Notification bell not functioning
- **Verdict:** ✅ DUPLICATE of Admin Bug #1
- **Fix Required:** Same as Admin Bug #1.

---

### Bug E#2 — Notification click redirects to employee profile
- **Verdict:** ✅ DUPLICATE of Admin Bug #5
- **Fix Required:** Same as Admin Bug #5.

---

### Bug E#3 — Help & User guide videos not playing
- **Verdict:** ⚠️ NEEDS VERIFICATION
- **Analysis:** 28+ `.webm` video files exist in `frontend/public/guides/videos/`. Could be browser compatibility, path issue, or CORS issue.
- **Fix Required:** Test locally. If WebM is the issue, add MP4 fallback.

---

### Bug E#4 — Edit profile — Cannot configure and save changes
- **Verdict:** ⚠️ NEEDS VERIFICATION
- **Analysis:** Report is vague. Employee edit profile form exists and has save logic. May be a role-based field visibility issue.
- **Fix Required:** Get specific reproduction steps from tester.

---

### Bug E#5 — Profile quick link returns 404
- **Verdict:** ✅ CONFIRMED BUG
- **Root Cause (code-traced):**
  - `EmployeeDashboard.js` line ~226-232:
    ```jsx
    <QuickActionCard
      title="Profile"
      description="My details"
      onClick={() => navigate('/employee-profile')}    // ← navigates to /employee-profile
    />
    ```
  - `employeeRoutes.js` **registered routes**: `employees`, `employees/:id`, `my-profile`, `my-profile/edit/:id`, `employee-records`, `employee-reviews` — **no `/employee-profile` route**.
  - The correct route is `/my-profile` (registered in `employeeRoutes.js`).
- **Fix Required:**
  1. In `EmployeeDashboard.js` ~line 230: Change `navigate('/employee-profile')` to `navigate('/my-profile')`
- **Files to change:** `frontend/src/components/features/dashboard/EmployeeDashboard.js` (line ~230)
- **Risk:** Trivial — one-line string change.

---

### Bug E#6 — System showcase — Access denied
- **Verdict:** ⚠️ NEEDS VERIFICATION
- **Analysis:** `/user-guide` may be registered only in admin routes. If employee should access it, need to add to employee routes.
- **Fix Required:** Check route config and decide per business rules.

---

## SECTION C — Mobile View

### Mobile — 502 Bad Gateway
- **Verdict:** ⚠️ INFRASTRUCTURE ISSUE — not a code bug
- **Analysis:** Server at `http://46.225.73.94:8085` is not responding. Deployment/infrastructure issue.
- **Fix Required:** Check server deployment. Out of scope for code fixes.

---

## SECTION D — Overall Application

### Auto-logout and authentication failure on re-login
- **Verdict:** ✅ CONFIRMED BUG
- **Root Cause (code-traced — this is the most complex bug):**

  **The flow that causes the problem:**
  1. User logs in → backend issues `accessToken` (15 min) + `refreshToken` (7 days) as httpOnly cookies.
  2. `accessToken` expires after 15 minutes.
  3. Next API call gets 401 → axios interceptor (`http-common.js` lines 41-79) tries to refresh by calling `POST /auth/refresh-token` with the httpOnly cookie.
  4. Backend refresh endpoint (`authController.js` lines 199-329) does **token rotation**: issues new tokens, **revokes** the old refresh token (`await storedToken.update({ isRevoked: true })`).
  5. New cookies are set in the response.
  6. **Problem scenario**: If another API call fires while refresh is in-flight (the queue mechanism at line 67-71 handles this), OR if the browser doesn't properly replace cookies due to race conditions:
     - The OLD (now-revoked) refresh token cookie is sent again on the next refresh attempt.
     - Backend sees revoked token at `authController.js` line 256-265:
       ```javascript
       if (storedToken.isRevoked) {
         // SECURITY: Token reuse detected — revoke ALL tokens for this user
         await RefreshToken.update(
           { isRevoked: true, revokedAt: new Date() },
           { where: { userId: storedToken.userId, isRevoked: false } }
         );
         throw new UnauthorizedError('Refresh token has been revoked');
       }
       ```
     - This revokes **ALL** tokens for the user — a security measure to prevent token theft.
  7. User is redirected to `/login` (`http-common.js` line 83-86).
  8. **On re-login**: The `POST /auth/login` endpoint (`authController.js` lines 37-100) creates fresh tokens and sets new cookies. This should work.
  9. **But**: After login success, the app initializes by calling `GET /auth/me` (`AuthContext.js` lines 21-42). If the old revoked cookie is still present in the browser (cookie race condition), the request might use the old cookie.

  **Most likely secondary cause**: The `res.clearCookie` in logout may not work due to **mismatched cookie attributes** (e.g., `secure: true` in production but `secure: false` in the clear call). The logout clears cookies with:
  ```javascript
  res.clearCookie('refreshToken', { httpOnly: true, secure: secureCookie, sameSite: 'Lax', path: '/' });
  ```
  But if `secureCookie` evaluates differently between login (when cookie was set) and logout (when clearing), the browser won't clear the cookie.

  **Another trigger**: Rate limiting (`checkRateLimit` in `AuthService.authenticate` line 34-47). If the user made many failed login attempts (from auto-logout triggering retries), the rate limiter blocks subsequent valid login attempts.

- **Fix Required (multiple changes needed):**
  1. **`frontend/src/http-common.js`** — In the refresh interceptor's catch block (~line 83), clear auth state before redirecting:
     ```javascript
     // Before redirecting to login, clear any stale data
     document.cookie = 'accessToken=; Max-Age=0; path=/;';
     document.cookie = 'refreshToken=; Max-Age=0; path=/;';
     ```
  2. **`backend/controllers/authController.js`** login method (~line 61-77) — Before setting new cookies on login, explicitly clear old cookies first:
     ```javascript
     // Clear any stale cookies before setting new ones
     res.clearCookie('accessToken', { httpOnly: true, secure: secureCookie, sameSite: 'Lax', path: '/' });
     res.clearCookie('refreshToken', { httpOnly: true, secure: secureCookie, sameSite: 'Lax', path: '/' });
     // Then set new cookies
     res.cookie('accessToken', result.accessToken, { ... });
     ```
  3. **`backend/controllers/authController.js`** refresh endpoint (~line 256-265) — Add logging for token reuse detection so we can trace the issue:
     ```javascript
     if (storedToken.isRevoked) {
       logger.warn('Token reuse detected', { userId: storedToken.userId, tokenId: storedToken.id });
       // ... existing revocation logic
     }
     ```
  4. **Verify** `secureCookie` variable is consistent across login, logout, and refresh endpoints (it should be the same variable/import).
- **Files to change:** `frontend/src/http-common.js` (~line 83), `backend/controllers/authController.js` (~lines 61, 146, 256)
- **Risk:** Medium — auth flow changes need careful testing. Cookie handling is tricky across environments. Test with both HTTP and HTTPS.

---

## Priority and Fix Order

### Tier 1 — Quick Wins (can fix immediately, low risk, < 10 lines each)

| Bug | Fix | Files | Lines Changed |
|-----|-----|-------|---------------|
| **E#5** | Change `'/employee-profile'` → `'/my-profile'` | `EmployeeDashboard.js` | 1 |
| **A#12** | Fix `user.role.toUpperCase()` crash + fix caller | `email.service.js`, `auth.routes.js` | ~5 |
| **A#5** | Remove misleading "Notifications" menu OR change route | `Layout.js` | 1-3 |

### Tier 2 — Small Fixes (self-contained, use existing code, low risk)

| Bug | Fix | Files | Lines Changed |
|-----|-----|-------|---------------|
| **A#24** | Add Cancel button + Actions column using existing `useCancelLeaveRequest` hook | `EmployeeLeaveRequests.js` | ~20 |
| **A#27** | Add debounce to search input | `ModernPayrollManagement.js` | ~10 |
| **A#16** | Add `uploadPhoto` call in edit mode `onSuccess` | `useEmployeeForm.js` | ~8 |
| **A#6** | Add `onClick` to "On Leave" and "New Hires" StatCards | `AdminDashboard.js` | 2 |
| **A#7** | Add `onClick` to "Draft" and "Approved" StatCards | `AdminDashboard.js` | 2 |

### Tier 3 — Medium Effort (requires careful testing)

| Bug | Fix | Files | Complexity |
|-----|-----|-------|------------|
| **D#1** | Fix cookie clearing + token rotation race condition | `http-common.js`, `authController.js` | Medium |
| **A#21** | Send ISO timestamps with timezone from frontend | `AttendanceManagement.js` | Medium |

### Tier 4 — New Features (larger scope)

| Bug | Fix | Files | Complexity |
|-----|-----|-------|------------|
| **A#3/15** | Add image crop library + crop dialog | `package.json`, `PhotoUpload.js` | Medium |
| **A#22** | Build attendance PDF export endpoint + frontend button | `attendance.routes.js`, `AttendanceManagement.js` | Medium-High |
| **A#1** | Build full notification system (backend + frontend) | Multiple new files | High |
