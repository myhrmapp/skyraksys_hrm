# SkyrakSys HRM — What's New in Prod Release 3

> Release Date: July 2026 | Branch: `prod-release-3`

---

## 🚀 New Features

### 1. Real-Time Notification Engine
A completely new real-time communication layer has been built from the ground up.

- **Live Push Notifications** via Socket.io — notifications appear instantly on screen without page refresh
- **Role-Based Targeting** — Admins can send notifications to specific roles (HR only, Managers only, etc.)
- **Department-Based Targeting** — Send announcements to a specific department
- **Broadcast Popups** — Critical announcements display as modal popups, not just silent bell icons
- **Notification Center** — New `/notifications` page where employees can view their full notification history and mark items as read
- **Image Support** — Broadcast messages can now include rich images
- **Room-Based Routing** — Each user, role, and department gets a private Socket.io room for targeted delivery

---

### 2. Invoice & Billing Module
A complete client billing and invoice management system.

- **Client Management** — Create and manage client records (`/admin/clients`)
- **Invoice Templates** — Design reusable invoice layouts with company branding
- **Invoice Generation** — Raise invoices against clients, track status (Draft → Sent → Paid)
- **PDF Export** — Generate professional PDF invoices for client delivery
- **Encryption at Rest** — Sensitive invoice financial data (amounts, bank details) are AES-256-GCM encrypted in the database
- **Invoice Template Hub** — Dedicated admin UI at `/admin/template-hub`

---

### 3. Server-Managed Payroll Vault
Enterprise-grade encryption for sensitive salary data.

- **AES-256-GCM Encryption** — Salary fields (basic pay, deductions, bonuses) are encrypted in the database using a server-managed key
- **Vault Dashboard** — Admins can view vault status, enable/disable encryption, and rotate keys at `/payroll/vault-settings`
- **Zero-Trust Architecture** — Even database admins cannot read salary data without the `ENCRYPTION_KEY` environment variable
- **Key Rotation** — Rotate encryption keys without losing existing data

---

### 4. Goals & OKR Tracking
A new performance module for setting and tracking objectives.

- **Goal Setting** — Employees and managers can create Goals with descriptions and deadlines
- **Key Results** — Each goal supports multiple measurable Key Results (OKR methodology)
- **Progress Tracking** — Update progress on key results in real-time
- **My Goals Page** — Personal dashboard for employees at `/reviews/my-goals`

---

### 5. Organisation Chart
A visual, interactive org chart of the company hierarchy.

- Renders the full reporting structure from CEO down to individual contributors
- Clickable nodes that navigate to employee profiles
- Available at `/employees/org-chart`

---

## 🔧 Improvements

### 6. Employee ID Renamed to SK### Format
- All existing employee IDs migrated from `SKYT####` → `SK###` (e.g. `SK001`, `SK042`)
- New employees created with sequential SK IDs (SK001, SK002 … SK999, SK1000)
- Database migration handles the rename atomically with rollback support
- Frontend validation updated to reflect the new format

### 7. ID Card — vCard QR Code
- Scanning an employee's printed ID badge QR code now opens a **digital contact card** (vCard) on smartphones
- Contact card includes: Name, Job Title, Company, Work Email, Work Phone
- Works natively on iPhone and Android cameras — no app needed

### 8. ID Card Branding — Database-Backed Settings
- ID Card colors, tagline, and website URL are now stored in the **PostgreSQL database** (was `localStorage`)
- Changes made by one Admin are instantly reflected across all computers
- Settings managed at System Settings → ID Card tab

### 9. Upgraded Broadcast Manager
- The Broadcasts tab in System Settings now uses the full-featured `AdminBroadcast` component
- Supports image uploads, popup toggles, and rich message formatting
- Powered by the new `/api/notifications/broadcast` endpoint

### 10. Attendance Hub
- A unified hub page groups all attendance-related views (daily logs, reports, admin management)
- Cleaner navigation with tabbed interface

### 11. Leave Hub
- All leave-related screens consolidated under a single hub
- Leave requests, balances, and admin management accessible via tabs

### 12. Dashboard Hub
- Role-aware dashboard hub that renders the correct dashboard based on the logged-in user's role (Admin, Manager, Employee)

---

## 🛡️ Security Hardening

### 13. JWT Token Blacklist (JTI)
- Logout now immediately invalidates the access token server-side using a JTI (JWT ID) blacklist
- Prevents token reuse after logout even if the token hasn't expired

### 14. Data-Level Row Access Control
- New `canAccessEmployee` middleware applied to all employee data endpoints
- Employees can only query **their own** records
- Managers can only query **their direct reports**
- Admin/HR have unrestricted access

### 15. Invoice Data Encryption
- Database migration `20260719000003` converts invoice sensitive columns to `TEXT` to store AES-256-GCM ciphertext
- Plaintext values never written to disk

---

## 🗄️ Database Changes (Migrations)

| Migration | Description |
|-----------|-------------|
| `20260719000001` | Added `managerId` to Projects; added `payFrequency` to SalaryStructures |
| `20260719000002` | Created `invoices` and `invoice_templates` tables |
| `20260719000003` | Altered invoice columns to `TEXT` for encrypted storage |
| `20260721000001` | Extended `photoUrl` column to `TEXT` to support Base64 photos |
| `20260721000002` | Renamed all employee IDs from `SKYT####` → `SK###` format |
| `20260721000003` | Added `imageUrl` and `isPopup` fields to the `notifications` table |
| `20260721000004` | Seeded 4 default invoice templates |
| `20260721000005` | Created the `clients` table |
| `20260721000006` | Created the `payroll_vault_configs` table |
| `20260721000007` | Added encrypted financial columns to `salary_structures` |

---

## 📁 New Files Added

### Backend
- `backend/socket.js` — Socket.io server initialization and room management
- `backend/services/NotificationService.js` — Role/department-targeted notification engine
- `backend/controllers/notificationController.js` — REST API for notifications
- `backend/controllers/vaultController.js` — Vault encryption management
- `backend/controllers/clientController.js` — Client CRUD
- `backend/controllers/invoiceTemplateController.js` — Invoice template management
- `backend/models/notification.model.js` — Notification DB model
- `backend/models/payroll-vault-config.model.js` — Vault config DB model
- `backend/models/client.model.js` — Client DB model
- `backend/models/invoice.model.js` — Invoice DB model
- `backend/models/goal.model.js` + `key-result.model.js` — OKR models
- `backend/utils/vaultCrypto.js` — AES-256-GCM encryption utilities
- `backend/utils/invoiceEncryption.js` — Invoice-specific encryption
- `backend/utils/invoicePdfGenerator.js` — PDF generation from invoice data
- `backend/middleware/vault.middleware.js` — Vault access middleware
- `scripts/deploy/go-live.sh` — One-time production go-live script
- `scripts/deploy/run-migrations.sh` — Safe incremental migration script

### Frontend
- `frontend/src/components/features/notifications/NotificationsPage.js` — Notification centre
- `frontend/src/components/features/notifications/BroadcastPopup.js` — Popup alert component
- `frontend/src/components/features/payroll/PayrollVaultSettings.js` — Vault management UI
- `frontend/src/components/features/employees/components/EmployeeIDCard.js` — ID card with vCard QR
- `frontend/src/components/features/employees/components/IDCardModal.js` — Print preview modal
- `frontend/src/components/features/employees/components/OrganizationChart.js` — Visual org chart
- `frontend/src/components/features/reviews/MyGoals.js` — OKR goals page
- `frontend/src/components/features/admin/IDCardCustomizer.js` — DB-backed ID card branding
- `frontend/src/components/admin/AdminBroadcast.js` — Rich broadcast UI
- `frontend/src/services/notification.service.js` — Notification API service
- `frontend/src/services/socket.service.js` — Socket.io client service
- `frontend/src/services/invoice.service.js` — Invoice API service
- `frontend/src/services/client.service.js` — Client API service
- `frontend/src/utils/photoUrl.js` — Utility for resolving employee photo URLs

---

## 🔗 Key URLs

| Feature | URL |
|---------|-----|
| Notifications | `/notifications` |
| Org Chart | `/employees/org-chart` |
| My Goals | `/reviews/my-goals` |
| Vault Settings | `/payroll/vault-settings` |
| Broadcasts | `/admin/broadcasts` |
| Invoice Management | `/admin/invoices` |
| Template Hub | `/admin/template-hub` |
| System Settings | `/admin/settings` |
