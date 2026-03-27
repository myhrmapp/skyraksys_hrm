# SkyrakSys HRM — UX Design System

> **Document Owner**: UX Designer / Frontend Lead  
> **Version**: 2.0 | **Last Updated**: 2026-03-26  
> **Audience**: UI developers, designers, frontend team

---

## 1. Design Philosophy

- **Modern & Clean**: Indigo/slate palette, generous whitespace, rounded corners
- **Consistent**: All components follow MUI v5 theme overrides
- **Accessible**: WCAG 2.1 contrast ratios, keyboard navigation, ARIA labels
- **Responsive**: Desktop-first with mobile card views for tables

---

## 2. Color System

### Primary Palette

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Primary | `#6366f1` | 99, 102, 241 | Buttons, links, active states, accent |
| Primary Light | `#818cf8` | 129, 140, 248 | Hover states, subtle highlights |
| Primary Dark | `#4f46e5` | 79, 70, 229 | Active states, focus |
| Secondary | `#8b5cf6` | 139, 92, 246 | Gradients, secondary accent |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Success | `#10b981` | Approved, active, positive |
| Warning | `#f59e0b` | Pending, caution |
| Error | `#ef4444` | Rejected, destructive, errors |
| Info | `#06b6d4` | Informational, links |

### Neutral Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background (page) | `#f8fafc` | Page background |
| Background (card) | `#ffffff` | Cards, dialogs |
| Text primary | `#1e293b` | Body text, headings |
| Text secondary | `#64748b` | Labels, helper text |
| Divider | `#e2e8f0` | Borders, separators |
| Table header bg | `#f8fafc` | Table header row |
| Row hover | `#f1f5f9` | Table row hover |

### Status Colors (used in chips/badges)

```
Active/Approved  → success (#10b981)
Pending          → warning (#f59e0b)
Rejected/Error   → error (#ef4444)
Draft            → default (grey)
Inactive         → default (grey)
```

---

## 3. Typography

### Font Stack

```css
font-family: "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 2.5rem (40px) | 700 | 1.2 |
| H2 | 2rem (32px) | 700 | 1.3 |
| H3 | 1.75rem (28px) | 600 | 1.3 |
| H4 | 1.5rem (24px) | 600 | 1.4 |
| H5 | 1.25rem (20px) | 600 | 1.4 |
| H6 | 1.1rem (17.6px) | 600 | 1.5 |
| Body 1 | 1rem (16px) | 400 | 1.6 |
| Body 2 | 0.875rem (14px) | 400 | 1.57 |
| Button | 0.875rem (14px) | 500 | — |
| Caption | 0.75rem (12px) | 400 | 1.5 |

### Rules

- Buttons: **no uppercase** (`textTransform: none`)
- Headings: `letterSpacing: -0.01em` (H1–H3), `0em` (H4–H6)
- All headings use `color: text.primary` (#1e293b)

---

## 4. Shape & Spacing

### Border Radius

| Element | Radius |
|---------|--------|
| Default (MUI) | 12px |
| Cards | 16px |
| Buttons | 10px |
| Text Fields | 10px |
| Chips | 8px |
| Dialogs | 16px |
| Alerts | 12px |
| Tooltips | 8px |

### Spacing

MUI's 8px grid system. Common values:
- `spacing(1)` = 8px (chip padding)
- `spacing(2)` = 16px (card padding, form gaps)
- `spacing(3)` = 24px (section gaps)
- `spacing(4)` = 32px (page margins)

---

## 5. Component Specifications

### 5.1 Buttons

| Variant | Style | Hover Effect |
|---------|-------|-------------|
| Contained | 10px radius, 6px/16px padding, `textTransform: none` | `translateY(-1px)` + enhanced box shadow |
| Outlined | 1.5px border, same padding | `translateY(-1px)` + border color darken |
| Text | No border, transparent bg | Background highlight |

**Size**: `small` = 0.8125rem, `medium` = 0.875rem, `large` = 0.9375rem

### 5.2 Cards

```css
border-radius: 16px;
box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
transition: box-shadow 0.2s ease, transform 0.2s ease;

/* Hover */
box-shadow: 0 10px 25px rgba(99,102,241,0.08), 0 6px 10px rgba(99,102,241,0.04);
```

### 5.3 Text Fields

```css
border-radius: 10px;
background: action.hover on focused;

/* Focus ring */
box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
border-color: primary.main;
border-width: 2px;
```

### 5.4 Tables

| Element | Style |
|---------|-------|
| Header row | Background: `#f8fafc`, text: uppercase 0.75rem/600, color: `text.secondary` |
| Body row | Bottom border: `#f1f5f9` |
| Row hover | Background: `#f8fafc` with 0.3s transition |
| Cell padding | 16px |

### 5.5 Chips

```css
border-radius: 8px;
font-weight: 500;
font-size: 0.8125rem;
height: 28px;
```

### 5.6 Dialogs

```css
border-radius: 16px;
box-shadow: 0 25px 50px rgba(0,0,0,0.12);
```

### 5.7 Alerts

```css
border-radius: 12px;
border: 1px solid (color-specific);
```

### 5.8 Tooltips

```css
border-radius: 8px;
font-size: 0.75rem;
background: #1e293b;
padding: 6px 12px;
```

---

## 6. Layout System

### Sidebar Navigation

- **Width**: 280px (expanded), collapsed on mobile
- **Structure**: Role-aware menu groups
- **Menu Groups** (admin/hr view):
  1. Dashboard
  2. People Management (Employees, Records, Reviews)
  3. Leave Management (Management, Requests, Types, Balances, Accrual)
  4. Time & Attendance (Timesheets, Attendance)
  5. Payroll & Reports (Payroll, Payslips, Reports, Templates)
  6. Settings (Users, Organization, System, Holidays, Restore)
  7. My Work (Profile, Tasks, My Payslips, My Leave)
  8. Help (User Guide)

### Page Layout

```
┌──────────────────────────────────────────────┐
│  AppBar (64px height)                         │
│  ┌──────┬───────────────────────────────────┐ │
│  │ Side │  Content Area                     │ │
│  │ bar  │  ┌─────────────────────────────┐  │ │
│  │ 280px│  │ Page Title + Breadcrumbs    │  │ │
│  │      │  │ ┌─────────┐ ┌─────────────┐│  │ │
│  │      │  │ │ Filters │ │ Action Bar  ││  │ │
│  │      │  │ └─────────┘ └─────────────┘│  │ │
│  │      │  │ ┌─────────────────────────┐│  │ │
│  │      │  │ │ Data Table / Cards      ││  │ │
│  │      │  │ └─────────────────────────┘│  │ │
│  │      │  │ ┌─────────────────────────┐│  │ │
│  │      │  │ │ Pagination              ││  │ │
│  │      │  │ └─────────────────────────┘│  │ │
│  │      │  └─────────────────────────────┘  │ │
│  └──────┴───────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 7. Responsive Behavior

### Breakpoints (MUI defaults)

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| xs | 0–599px | Mobile: sidebar collapses, cards instead of tables |
| sm | 600–899px | Tablet: sidebar drawer, compact tables |
| md | 900–1199px | Desktop: sidebar visible |
| lg | 1200–1535px | Wide desktop |
| xl | 1536px+ | Ultra-wide |

### ResponsiveTable Pattern

```javascript
<ResponsiveTable
  columns={[...]}
  data={rows}
  renderTableRow={(row) => <TableRow>...</TableRow>}
  renderMobileCard={(row) => <Card>...</Card>}
/>
```
- md+: Standard MUI table
- xs–sm: Stacked cards

---

## 8. Loading & Empty States

### Loading Patterns

| Context | Component | Behavior |
|---------|-----------|----------|
| Page load | `Suspense` fallback | Centered spinner via `withBoundary()` |
| Data fetch | TanStack Query `isLoading` | `TableSkeleton` or `CircularProgress` |
| Form submit | `LoadingContext` | Global backdrop with progress |
| Background | `LoadingContext.setLoading(key)` | Per-key loading state |

### Empty States

```javascript
<EmptyState
  icon={<PersonAddIcon />}
  title="No employees found"
  description="Add your first employee to get started"
  action={{ label: "Add Employee", onClick: () => navigate('/employees/add') }}
/>
```

---

## 9. Notification System

| Type | Color | Duration | Icon |
|------|-------|----------|------|
| Success | Green | 5s | ✅ CheckCircle |
| Error | Red | 8s | ❌ Error |
| Warning | Amber | 7s | ⚠️ Warning |
| Info | Blue | 5s | ℹ️ Info |

**Placement**: Top-right, max 3 stacked  
**Behavior**: Auto-dismiss, manual close button

---

## 10. Form Design Patterns

### Multi-Step Forms (EmployeeForm)

```
Step 1: Personal Info    →  Step 2: Employment    →  Step 3: Compensation
[First Name] [Last Name]    [Department ▼]            [Basic Salary]
[Email]      [Phone]        [Position ▼]              [HRA] [Allowances]
[DOB]        [Gender ▼]     [Manager ▼]               [PF] [ESI] [TDS]
[Address]    [City]          [Hire Date]               [Currency] [Effective]
```

- Stepper navigation at top
- Validation per step before advancing
- Auto-save support (`StandardForm`)

### Field Layout

- 2 columns on desktop, 1 column on mobile
- Labels above fields (MUI `outlined` variant)
- Required fields marked with `*`
- Helper text below fields for hints
- Error messages in red below fields
- Focus ring: indigo `0 0 0 3px rgba(99,102,241,0.1)`

---

## 11. Icon Usage

Material Icons from `@mui/icons-material`. Common usage:

| Context | Icons |
|---------|-------|
| Navigation | Dashboard, People, EventNote, Timer, Payment, Settings |
| Actions | Add, Edit, Delete, Save, Cancel, Search, Filter |
| Status | CheckCircle (approved), Pending (pending), Cancel (rejected) |
| Feedback | Error, Warning, Info, Success |

---

## 12. Charts (Recharts)

Used on dashboard pages:

| Chart Type | Usage |
|-----------|-------|
| Bar chart | Employee count by department |
| Pie chart | Leave type distribution |
| Line chart | Attendance trends |
| Area chart | Payroll monthly trends |

Color scheme follows the primary palette with semantic colors.

---

*End of Document — See [00-INDEX.md](./00-INDEX.md) for the full documentation suite.*
