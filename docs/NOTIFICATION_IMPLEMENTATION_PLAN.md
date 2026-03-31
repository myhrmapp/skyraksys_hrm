# In-App Notification System — Implementation Plan

**Date:** 2026-03-31  
**Status:** Planned  
**Estimated Effort:** ~1.5 days  

---

## 1. What We're Building

A persistent in-app notification system. Users see a bell icon with an unread badge in the header bar. Clicking it opens a dropdown with recent notifications. Business events (leave approved, timesheet rejected, payslip generated, etc.) automatically create notifications for the relevant users.

**Not in scope (v1):** WebSocket/real-time push, email digests, mobile push notifications, notification preferences/settings page. These can be added later without changing the v1 schema.

---

## 2. Current State

| Component | Status |
|-----------|--------|
| Bell icon in `Layout.js` (line ~490) | Exists but **no onClick, no badge, no dropdown** |
| "Notifications" menu item (line ~650) | Navigates to `/my-profile` (wrong) |
| Notification DB model | **Does not exist** |
| Backend route `/api/notifications` | **Does not exist** |
| Frontend `notificationService.js` | **Does not exist** |
| `NotificationContext.js` | Exists but only wraps **notistack snackbars** (toast popups, not persistent notifications) |

---

## 3. Database Schema

### Table: `notifications`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default UUIDV4 | |
| `userId` | UUID | FK → users.id, NOT NULL, indexed | Recipient |
| `type` | ENUM | NOT NULL | Category (see list below) |
| `title` | STRING(255) | NOT NULL | Short headline |
| `message` | TEXT | NOT NULL | Detail text |
| `referenceType` | STRING(50) | nullable | Entity type: `leave`, `timesheet`, `payslip`, `review`, `task`, `attendance` |
| `referenceId` | UUID | nullable | ID of the related entity |
| `isRead` | BOOLEAN | default false, indexed | |
| `readAt` | DATE | nullable | When marked read |
| `createdAt` | DATE | NOT NULL | |
| `updatedAt` | DATE | NOT NULL | |

**Indexes:**
- `idx_notifications_user_read` — composite on `(userId, isRead)` — powers "unread count" query
- `idx_notifications_user_created` — composite on `(userId, createdAt DESC)` — powers "recent notifications" list
- `idx_notifications_reference` — composite on `(referenceType, referenceId)` — for dedup/lookup

**Notification Types (ENUM):**
```
leave_approved, leave_rejected, leave_cancelled, leave_submitted,
timesheet_approved, timesheet_rejected, timesheet_submitted,
payslip_generated,
review_assigned, review_completed,
task_assigned, task_updated,
attendance_marked,
system_announcement
```

### Migration file
`backend/migrations/20260331000001-create-notifications.js`

---

## 4. Backend Changes

### 4.1 Model — `backend/models/notification.model.js`

Standard Sequelize model matching the schema above.

**Associations:**
```javascript
Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
```

**Register in** `backend/models/index.js`:
```javascript
db.Notification = require('./notification.model')(sequelize, Sequelize);
```

### 4.2 Service — `backend/services/notification.service.js`

| Method | Purpose |
|--------|---------|
| `createNotification({ userId, type, title, message, referenceType, referenceId })` | Create a single notification |
| `createBulkNotifications(notifications[])` | Create notifications for multiple users (e.g., "new leave request" → all HR users) |
| `getUserNotifications(userId, { page, limit, unreadOnly })` | Paginated list for a user |
| `getUnreadCount(userId)` | Returns `{ count: N }` |
| `markAsRead(notificationId, userId)` | Mark one as read (ownership check) |
| `markAllAsRead(userId)` | Mark all of user's notifications as read |
| `deleteNotification(notificationId, userId)` | Soft or hard delete (ownership check) |
| `notifyUser(userId, type, title, message, ref?)` | Convenience wrapper for createNotification |
| `notifyUsers(userIds[], type, title, message, ref?)` | Convenience wrapper for createBulkNotifications |
| `notifyRole(role, type, title, message, ref?)` | Finds all active users with that role, creates notifications |

### 4.3 Controller — `backend/controllers/notificationController.js`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `getNotifications` | GET `/api/notifications` | authenticate | Returns paginated list for `req.userId` |
| `getUnreadCount` | GET `/api/notifications/unread-count` | authenticate | Returns `{ count }` |
| `markAsRead` | PATCH `/api/notifications/:id/read` | authenticate | Marks one notification read |
| `markAllAsRead` | PATCH `/api/notifications/read-all` | authenticate | Marks all read |
| `deleteNotification` | DELETE `/api/notifications/:id` | authenticate | Deletes one (ownership verified) |

### 4.4 Routes — `backend/routes/notification.routes.js`

```javascript
const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.get('/',            authenticateToken, ctrl.getNotifications);
router.get('/unread-count', authenticateToken, ctrl.getUnreadCount);
router.patch('/:id/read',  authenticateToken, ctrl.markAsRead);
router.patch('/read-all',  authenticateToken, ctrl.markAllAsRead);
router.delete('/:id',      authenticateToken, ctrl.deleteNotification);

module.exports = router;
```

**Register in** `backend/server.js`:
```javascript
const notificationRoutes = require('./routes/notification.routes');
app.use('/api/notifications', notificationRoutes);
```

---

## 5. Frontend Changes

### 5.1 API Endpoints — `frontend/src/config/apiEndpoints.js`

Add to `API_ENDPOINTS`:
```javascript
NOTIFICATIONS: {
  BASE: '/notifications',
  UNREAD_COUNT: '/notifications/unread-count',
  MARK_READ: (id) => `/notifications/${id}/read`,
  MARK_ALL_READ: '/notifications/read-all',
  DELETE: (id) => `/notifications/${id}`,
},
```

### 5.2 Service — `frontend/src/services/notification.service.js`

```javascript
getNotifications(params)     // GET /notifications?page=&limit=&unreadOnly=
getUnreadCount()             // GET /notifications/unread-count
markAsRead(id)               // PATCH /notifications/:id/read
markAllAsRead()              // PATCH /notifications/read-all
deleteNotification(id)       // DELETE /notifications/:id
```

Export from `frontend/src/services/index.js`.

### 5.3 Layout Bell Button — `frontend/src/components/layout/Layout.js`

**Current** (~line 490):
```jsx
<IconButton aria-label="notifications" ...>
  <Notifications />
</IconButton>
```

**Change to:**
```jsx
<IconButton onClick={handleNotificationClick} aria-label="notifications" ...>
  <Badge badgeContent={unreadCount} color="error" max={99}>
    <Notifications />
  </Badge>
</IconButton>
```

**Add a Popover/Menu dropdown** that appears on click:
- Header: "Notifications" + "Mark all as read" link
- List of recent notifications (last 10), each showing:
  - Icon based on `type` (leave = event icon, timesheet = clock, payslip = receipt, etc.)
  - Title (bold if unread)
  - Message (truncated to 2 lines)
  - Time ago (e.g., "2 hours ago")
  - Click → navigate to the related entity + mark as read
- Footer: "View All Notifications" → navigates to `/notifications`

**Data fetching:** Use React Query (`useQuery`) to poll `getUnreadCount` every 60 seconds. Fetch full list only when popover opens.

### 5.4 Notifications Page — `frontend/src/components/features/notifications/NotificationsPage.js`

Full-page view of all notifications with:
- Tabs or filter: All / Unread
- Paginated list (DataGrid or virtual list)
- Each row: icon, title, message, timestamp, read/unread indicator
- Actions: Mark as read, Delete
- Bulk: "Mark all as read" button
- Click on a notification → navigate to related entity

### 5.5 Route Registration — `frontend/src/routes/adminRoutes.js` (or a new `notificationRoutes.js`)

```javascript
const NotificationsPage = lazy(() => import('../components/features/notifications/NotificationsPage'));

// Add route (accessible to ALL roles, not admin-only)
<Route key="notifications" path="notifications" element={withBoundary(<NotificationsPage />, 'Loading Notifications...')} />
```

### 5.6 Fix Menu Item — `Layout.js` (~line 650)

Change the "Notifications" menu item from navigating to `/my-profile` to `/notifications`.

### 5.7 Sidebar Nav — `Layout.js`

Add a "Notifications" item to the sidebar navigation (optional — the bell + menu item may be sufficient).

---

## 6. Business Event Wiring

These are one-line calls added to **existing** service methods. No refactoring needed.

| Event | Where to add | Notification recipient | Type |
|-------|-------------|----------------------|------|
| Leave submitted | `LeaveService.create()` | Employee's manager + all HR users | `leave_submitted` |
| Leave approved | `LeaveService.approve()` | The requesting employee | `leave_approved` |
| Leave rejected | `LeaveService.reject()` | The requesting employee | `leave_rejected` |
| Leave cancelled | `LeaveService.cancel()` | The original approver/HR | `leave_cancelled` |
| Timesheet submitted | `TimesheetService.submit()` | Employee's manager | `timesheet_submitted` |
| Timesheet approved | `TimesheetService.approve()` | The submitting employee | `timesheet_approved` |
| Timesheet rejected | `TimesheetService.reject()` | The submitting employee | `timesheet_rejected` |
| Payslip generated | `PayslipService.generate()` | The employee whose payslip was generated | `payslip_generated` |
| Review assigned | `EmployeeReviewService.create()` | The employee being reviewed | `review_assigned` |
| Review completed | `EmployeeReviewService.complete()` | The employee + HR | `review_completed` |
| Task assigned | `task.routes.js` (or service) | The assigned employee | `task_assigned` |

**Example wiring** (in LeaveService.approve):
```javascript
// After successful approval:
const notificationService = require('./notification.service');
await notificationService.notifyUser(
  leaveRequest.employeeId,            // recipient's userId
  'leave_approved',                    // type
  'Leave Request Approved',            // title
  `Your ${leaveRequest.leaveType} leave from ${leaveRequest.startDate} to ${leaveRequest.endDate} has been approved.`,
  'leave',                             // referenceType
  leaveRequest.id                      // referenceId
);
```

---

## 7. File Inventory

### New Files (8)

| # | File | Purpose |
|---|------|---------|
| 1 | `backend/migrations/20260331000001-create-notifications.js` | DB migration |
| 2 | `backend/models/notification.model.js` | Sequelize model |
| 3 | `backend/services/notification.service.js` | Business logic |
| 4 | `backend/controllers/notificationController.js` | HTTP handlers |
| 5 | `backend/routes/notification.routes.js` | Express routes |
| 6 | `frontend/src/services/notification.service.js` | API client |
| 7 | `frontend/src/components/features/notifications/NotificationsPage.js` | Full page view |
| 8 | `frontend/src/components/layout/NotificationBell.js` | Bell + dropdown component (extracted from Layout for cleanliness) |

### Modified Files (7)

| # | File | Change |
|---|------|--------|
| 1 | `backend/models/index.js` | Add `db.Notification` |
| 2 | `backend/server.js` | Add `app.use('/api/notifications', ...)` |
| 3 | `frontend/src/config/apiEndpoints.js` | Add `NOTIFICATIONS` section |
| 4 | `frontend/src/services/index.js` | Export `notificationService` |
| 5 | `frontend/src/components/layout/Layout.js` | Replace static bell with `<NotificationBell />`, fix menu item nav |
| 6 | `frontend/src/routes/adminRoutes.js` | Add notifications route (or create `notificationRoutes.js`) |
| 7 | `frontend/src/setupTests.js` | Add mock for notification service (if needed) |

### Business Event Wiring (modify existing services) (~6 files)

| # | File | Add notification call |
|---|------|-----------------------|
| 1 | `backend/services/LeaveService.js` | On submit/approve/reject/cancel |
| 2 | `backend/services/TimesheetService.js` | On submit/approve/reject |
| 3 | `backend/services/PayslipService.js` | On generate |
| 4 | `backend/services/EmployeeReviewService.js` | On assign/complete |
| 5 | `backend/services/task/` (or routes) | On assign |
| 6 | `backend/services/attendance.service.js` | On admin-mark (optional) |

---

## 8. Implementation Order

```
Phase 1 — Backend Foundation
  Step 1: Create migration + model
  Step 2: Register model in index.js
  Step 3: Create NotificationService
  Step 4: Create controller + routes
  Step 5: Register route in server.js
  Step 6: Run migration, test endpoints with curl/Postman

Phase 2 — Frontend UI
  Step 7: Create notification.service.js (API client)
  Step 8: Add NOTIFICATIONS to apiEndpoints.js
  Step 9: Export from services/index.js
  Step 10: Build NotificationBell component (badge + dropdown)
  Step 11: Replace static bell in Layout.js with NotificationBell
  Step 12: Fix menu item navigation → /notifications
  Step 13: Build NotificationsPage (full list view)
  Step 14: Add route for /notifications

Phase 3 — Business Event Wiring
  Step 15: Wire leave events
  Step 16: Wire timesheet events
  Step 17: Wire payslip events
  Step 18: Wire review events
  Step 19: Wire task events

Phase 4 — Verify
  Step 20: Run backend tests (ensure no breakage)
  Step 21: Manual smoke test — submit leave, check bell shows notification
```

---

## 9. Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Polling (60s) instead of WebSocket** | Simpler, no infrastructure changes, no new dependencies. WebSocket can be added in v2 without schema changes. |
| **Server-side notification creation** (not client) | Guarantees notifications exist even if frontend is closed. Single source of truth. |
| **Separate from notistack/snackbars** | Snackbars are ephemeral UI toasts. This system is persistent DB-backed notifications. Both coexist. |
| **No soft delete on notifications** | Low-value data. Hard delete is fine. Users can clear their notifications. |
| **UUID primary key** | Matches all other tables in the system. |
| **referenceType + referenceId** (polymorphic) | Avoids separate FK columns for every entity type. Easy to extend. |
| **NotificationBell as separate component** | Keeps Layout.js clean. Encapsulates polling + popover + badge logic. |
| **Ownership checks in controller** | `WHERE userId = req.userId` on every query. Users can only see/edit their own notifications. |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Polling every 60s adds DB load | Single lightweight `SELECT COUNT(*)` with indexed column. Negligible for <500 users. |
| Notification table grows unbounded | Add a scheduled cleanup job (delete notifications older than 90 days) in `scheduler.js` — can add later. |
| Business service changes break existing functionality | Each wiring is a single `await notificationService.notifyUser(...)` at the END of successful operations. Wrapped in try/catch so notification failure never blocks the main operation. |
| Frontend bell re-renders too often | React Query handles caching and dedup. `staleTime: 60000` prevents unnecessary refetches. |

---

## 11. Future Enhancements (v2)

- WebSocket/SSE for real-time push (eliminate polling)
- Notification preferences per user (opt out of certain types)
- Email digest (daily/weekly summary of unread notifications)
- Mobile push notifications via FCM (pairs with existing mobile app plan)
- `system_announcement` type — admin broadcasts to all users
- Notification grouping ("3 leave requests approved" instead of 3 separate entries)
