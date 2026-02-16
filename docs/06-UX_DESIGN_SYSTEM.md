# UX & Design System Guide

> **Last updated:** 2026-02-14 | **UI Framework:** MUI (Material-UI) 5.15 | **Theme:** `modernTheme.js`

---

## 1. Design Tokens

### 1.1 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| **Primary** | `#6366f1` (Indigo) | Primary actions, active states |
| Primary Light | `#818cf8` | Hover states, secondary emphasis |
| Primary Dark | `#4f46e5` | Active/pressed states |
| Primary Gradient | `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)` | Hero elements, cards |
| **Secondary** | `#8b5cf6` (Purple) | Secondary actions |
| **Success** | `#10b981` (Emerald) | Approved states, confirmations |
| **Warning** | `#f59e0b` (Amber) | Pending states, cautions |
| **Error** | `#ef4444` (Red) | Errors, rejected states, destructive actions |
| **Info** | `#06b6d4` (Cyan) | Informational elements |
| **Background** | `#f8fafc` | Page background |
| Background Paper | `#ffffff` | Cards, papers |
| Background Subtle | `#f1f5f9` | Table headers, section backgrounds |
| **Text Primary** | `#1e293b` | Headings, body text |
| Text Secondary | `#64748b` | Labels, captions, metadata |
| Text Disabled | `#cbd5e1` | Disabled elements |
| **Divider** | `#e2e8f0` | Borders, separators |

### 1.2 Typography

**Font Family:** `"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif`

| Variant | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| h1 | 2.5rem (40px) | 700 | 1.2 | -0.02em |
| h2 | 2rem (32px) | 700 | 1.3 | -0.01em |
| h3 | 1.75rem (28px) | 600 | 1.3 | — |
| h4 | 1.5rem (24px) | 600 | 1.4 | — |
| h5 | 1.25rem (20px) | 600 | 1.4 | — |
| h6 | 1.125rem (18px) | 600 | 1.4 | — |
| subtitle1 | 1rem (16px) | 500 | 1.5 | — |
| subtitle2 | 0.875rem (14px) | 500 | 1.5 | — |
| body1 | 1rem (16px) | 400 | 1.6 | — |
| body2 | 0.875rem (14px) | 400 | 1.6 | — |
| button | 0.875rem (14px) | 500 | — | 0.01em |
| caption | 0.75rem (12px) | 400 | 1.5 | — |

**Key rule:** `textTransform: 'none'` on buttons — no all-caps.

### 1.3 Spacing & Shape

| Token | Value |
|-------|-------|
| Border Radius (default) | 12px |
| Button Border Radius | 10px |
| Card Border Radius | 16px |
| Dialog Border Radius | 16px |
| Chip Border Radius | 8px |
| Icon Button Border Radius | 8px |

### 1.4 Shadows

Tailwind-inspired shadow scale (lighter than MUI defaults):

| Level | Shadow | Usage |
|-------|--------|-------|
| 0 | none | Flat |
| 1 | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| 2 | `0 1px 3px rgba(0,0,0,0.1)` | Cards (resting) |
| 3 | `0 4px 6px rgba(0,0,0,0.1)` | Medium elevation |
| 4 | `0 10px 15px rgba(0,0,0,0.1)` | Card hover, dropdowns |
| 5 | `0 20px 25px rgba(0,0,0,0.1)` | Modals, dialogs |
| 6+ | `0 25px 50px rgba(0,0,0,0.25)` | Max elevation |

### 1.5 Transitions

| Duration | Value | Usage |
|----------|-------|-------|
| shortest | 150ms | Micro-interactions |
| shorter | 200ms | Button hover |
| short | 250ms | Component animations |
| standard | 300ms | Page transitions |
| complex | 375ms | Multi-step animations |

Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (Material ease-in-out)

---

## 2. Component Overrides

### 2.1 Buttons (MuiButton)

```
All buttons:
  - No text transform (textTransform: 'none')
  - Border radius: 10px
  - Padding: 10px 20px
  - No box-shadow at rest
  - Hover: subtle shadow + translateY(-1px) float effect
  
Contained hover: stronger blue shadow (0.3 opacity)
Outlined: 1.5px border width
Small: 6px 16px padding, 0.8125rem font
Large: 12px 24px padding, 0.9375rem font
```

### 2.2 Cards (MuiCard)

```
Border radius: 16px
Resting shadow: subtle (level 2)
Hover: elevated shadow (level 4)
Transition: 0.2s ease-in-out
```

### 2.3 Text Fields (MuiTextField)

```
Border radius: 10px
Hover: blue border (#2563eb)
Focus: blue glow ring (3px, rgba(37, 99, 235, 0.1))
```

### 2.4 Tables

```
TableContainer: 12px radius, 1px solid border (#e2e8f0)
TableHead: #f8fafc background, 600 weight, uppercase text, 0.05em spacing
TableBody rows: hover with #f8fafc background + subtle shadow
Cell padding: 16px
Row border: 1px solid #f1f5f9 (very subtle)
```

### 2.5 Alerts

Soft, semi-transparent backgrounds with matching borders:
- **Success:** `rgba(16, 185, 129, 0.1)` bg, green border/text
- **Error:** `rgba(239, 68, 68, 0.1)` bg, red border/text
- **Warning:** `rgba(245, 158, 11, 0.1)` bg, amber border/text
- **Info:** `rgba(6, 182, 212, 0.1)` bg, cyan border/text

### 2.6 Dialogs

```
Paper border radius: 16px
Internal padding: 8px
```

### 2.7 Tabs

```
Tab text: no transform, 500 weight, 0.9375rem
Tab hover: blue text + subtle blue background
Selected: 600 weight
Indicator: 3px height, rounded top corners
```

### 2.8 Drawer / Sidebar

```
Paper: right border only (1px solid #e2e8f0), no shadow
```

---

## 3. Reusable Common Components

Located in `frontend/src/components/common/`:

### 3.1 ConfirmDialog

Reusable confirmation dialog. Used with `useConfirmDialog` hook:

```jsx
const { dialogProps, confirm } = useConfirmDialog();

// Trigger
confirm({
  title: 'Delete Employee',
  message: 'Are you sure? This action cannot be undone.',
  onConfirm: () => handleDelete(id)
});

// Render
<ConfirmDialog {...dialogProps} />
```

### 3.2 LoadingComponents

Context-exported skeleton components:

| Component | Usage |
|-----------|-------|
| `PageSkeleton` | Full page loading state |
| `TableSkeleton` | Table loading with shimmer rows |
| `FormSkeleton` | Form fields loading state |
| `CardSkeleton` | Dashboard card loading |

Used via `LoadingContext`:
```jsx
const { isLoading, setLoading } = useLoading();
setLoading('employees', true);
if (isLoading('employees')) return <TableSkeleton />;
```

### 3.3 SmartErrorBoundary

Class component error boundary with levels:

| Level | Behavior |
|-------|----------|
| `application` | Wraps entire app — full-page error with reload button |
| `routing` | Wraps Routes — shows error with navigation options |
| `component` | Individual component — shows inline error card |

Also exports `withErrorBoundary` HOC and `useErrorHandler` hook.

### 3.4 ErrorBoundary

Simpler error boundary alternative. Also exports:
- `withErrorBoundary(Component, options)` — HOC wrapper
- `AsyncErrorBoundary` — For async operation errors
- `useAsyncError()` — Hook for throwing async errors to nearest boundary

### 3.5 ProtectedRoute

Route guard component:
```
1. Loading → CircularProgress
2. Not authenticated → Navigate to /login (with returnUrl)
3. requiredRoles provided → check role membership
4. hasRouteAccess(role, pathname) → check via roleConfig
5. Denied → UnauthorizedPage component
```

### 3.6 ResponsiveTable

Responsive data table wrapper. Adapts layout for mobile screens — converts table rows to card-style layout on small viewports.

### 3.7 ResponsiveForm

Form layout wrapper. Adjusts grid columns based on viewport:
- Desktop: multi-column grid layout
- Tablet: 2-column
- Mobile: single-column stack

### 3.8 StandardForm

Standard form wrapper with consistent styling — header, field grid, action buttons.

### 3.9 TabbedPage

Page layout with tab navigation. Used for multi-section pages (e.g., Organization Settings → Departments | Positions | Calendar).

### 3.10 FormFields

Reusable form field components with built-in validation display. Wrappers around MUI TextField, Select, DatePicker with error/helperText integration.

### 3.11 PhotoUpload / PhotoUploadSimple

Employee photo upload component with preview and crop capabilities.

### 3.12 DashboardRedirect

Smart redirect component — routes to role-appropriate dashboard:
- admin/hr → `/admin-dashboard`
- manager → `/manager-dashboard`
- employee → `/employee-dashboard`

### 3.13 MobileOptimizedNavigation

Mobile-specific navigation component. Bottom navigation bar for small screens.

---

## 4. Layout Structure

### 4.1 Application Shell

```
┌─────────────────────────────────────────────┐
│  AppBar (Top)                               │
│  - Logo + App name                          │
│  - User avatar + dropdown                   │
│  - Mobile hamburger menu                    │
├────────┬────────────────────────────────────┤
│        │                                    │
│ Sidebar│     Main Content Area             │
│ (Drawer│                                   │
│  240px)│     Outlet renders routes          │
│        │                                    │
│ Grouped│                                    │
│ Accordi│                                    │
│ on Menu│                                    │
│        │                                    │
│        │                                    │
│        │                                    │
└────────┴────────────────────────────────────┘
```

### 4.2 Navigation Pattern

Sidebar uses **grouped accordion** pattern:
- Menu groups are MUI `Accordion` components
- Items are `ListItemButton` with icons
- Active item highlighted with primary color
- Groups organized by domain (People, Work, Payroll & Reports, Settings, My Stuff)
- Role-conditional rendering — each group/item checks user role before display

### 4.3 Responsive Behavior

- **Desktop (≥960px):** Permanent sidebar drawer (240px width)
- **Tablet (600-959px):** Temporary drawer (opens/closes via hamburger)
- **Mobile (<600px):** Temporary drawer + bottom navigation via `MobileOptimizedNavigation`

---

## 5. Notification Patterns

### 5.1 Two Notification Systems

The app has **two coexisting** notification systems:

**NotificationContext (custom):**
```jsx
const { showSuccess, showError, showWarning, showInfo } = useNotification();
showSuccess('Employee created successfully');
showError('Failed to load data');  // 8-second auto-hide
```

**notistack:**
```jsx
const { enqueueSnackbar } = useSnackbar();
enqueueSnackbar('Operation successful', { variant: 'success' });
```

Both render MUI `Snackbar` + `Alert`. Max 3 simultaneous notifications.

### 5.2 When to Use Which

- **React Query mutations** use `enqueueSnackbar` (notistack)
- **Form submissions** use `showSuccess`/`showError` (NotificationContext)
- **Both are valid** — no strict rule. Prefer consistency within a feature.

---

## 6. Status Color Conventions

| Status | Color | Chip Variant |
|--------|-------|-------------|
| Active / Approved / Present | `success` (green) | filled |
| Pending / Submitted / Draft | `warning` (amber) | filled |
| Rejected / Error / Absent | `error` (red) | filled |
| Inactive / Cancelled | `default` (gray) | outlined |
| On Leave / Late | `info` (cyan) | filled |
| Terminated | `error` | outlined |

---

## 7. Form Conventions

### 7.1 Field Layout

- Use MUI `Grid` container with `spacing={2}` or `spacing={3}`
- Standard field: `Grid item xs={12} sm={6}` (full width mobile, half desktop)
- Wide fields (address, description): `Grid item xs={12}`
- Action buttons: right-aligned in own `Grid item xs={12}`

### 7.2 Required Field Indicators

Required fields show `*` via MUI's `required` prop on `TextField`.

### 7.3 Validation Display

- Field-level: `TextField error={!!errors.field} helperText={errors.field}`
- Form-level: `Alert severity="error"` at top of form
- Success: Toast notification on successful submission

### 7.4 Date Fields

All dates use `YYYY-MM-DD` format (HTML date input via `type="date"`) or MUI `DatePicker`.

---

## 8. India-Specific UI Patterns

| Element | Format | Example |
|---------|--------|---------|
| Currency | Indian notation | ₹1,23,456.00 |
| Employee ID | SKYT#### | SKYT0042 |
| PAN | Uppercase auto-format | ABCDE1234F |
| Aadhaar | 12-digit | 123456789012 |
| Phone | 10-digit | 9876543210 |
| PIN Code | 6-digit | 400001 |
| IFSC | Uppercase auto-format | SBIN0001234 |
