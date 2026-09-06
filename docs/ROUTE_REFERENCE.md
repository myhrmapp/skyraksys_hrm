# Quick Reference: Application Routes

**Last Updated**: 2026-08-07

## Leave Management Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/leave` | Employee leave requests view | All roles |
| `/leave-requests` | Alias for `/leave` ⭐ NEW | All roles |
| `/leave-management` | Alias for `/leave` ⭐ NEW | All roles |
| `/leave?view=management` | Leave management view | Admin, HR, Manager |
| `/add-leave-request` | New leave request form | All roles |
| `/admin/leave-balances` | Leave balance admin | Admin, HR |
| `/admin/leave-accrual` | Leave accrual management | Admin, HR |
| `/admin/leave-types` | Leave type configuration | Admin, HR |

## Employee Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/employees` | Employee list | Admin, HR, Manager |
| `/employees/add` | Create new employee | Admin, HR |
| `/employees/:id` | Employee profile/edit | Admin, HR |
| `/employee-profile` | My profile (current user) | All roles |

## Payroll Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/payroll` | Payroll management | Admin, HR |
| `/employee-payslips` | My payslips | Employee |
| `/admin/payslips` | Payslip admin | Admin, HR |

## Dashboard Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/dashboard` | Role-based dashboard | All roles |
| `/` | Redirects to dashboard | All roles |

## Admin Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/admin/settings-hub` | System settings | Admin |
| `/clients` | Client management | Admin, HR |
| `/admin/invoices` | Invoice management | Admin, HR |
| `/admin/debug` | Debug panel (dev only) | Dev environment only |

## Other Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/login` | Login page | Public |
| `/forgot-password` | Password recovery | Public |
| `/timesheets` | Timesheet management | All roles |
| `/attendance` | Attendance tracking | All roles |

---

## Common Navigation Patterns

### From Dashboard to Leave
```javascript
// All of these work:
navigate('/leave')
navigate('/leave-requests')      // Alias ⭐
navigate('/leave-management')     // Alias ⭐
navigate('/leave?view=management') // For admin/manager view
```

### Creating New Records
```javascript
navigate('/employees/add')        // New employee
navigate('/add-leave-request')    // New leave request
navigate('/timesheets/add')       // New timesheet
```

---

## Error Handling

### 404 Not Found
When a route doesn't exist, users see:
- Clear error message
- Quick links to common pages:
  - Dashboard
  - Employees
  - Leave Requests
  - Timesheets

### Route Aliases
These aliases ensure backward compatibility and better UX:
- `/leave-requests` → `/leave`
- `/leave-management` → `/leave`

---

## For Developers

### Adding New Routes

1. Create route in appropriate file:
   - `routes/leaveRoutes.js`
   - `routes/employeeRoutes.js`
   - `routes/adminRoutes.js`
   - etc.

2. Import and include in `App.js`:
   ```javascript
   import myRoutes from './routes/myRoutes';
   
   // Inside the ProtectedRoute:
   {myRoutes}
   ```

3. Update role config in `utils/roleConfig.js`:
   ```javascript
   '/my-route': [ROLES.ADMIN, ROLES.HR]
   ```

### Route Testing

Test all navigation patterns:
```javascript
// Direct URL
window.location.pathname === '/leave'

// Programmatic navigation
navigate('/leave')
navigate('/leave', { state: { filter: 'pending' } })

// With query params
navigate('/leave?view=management&status=pending')
```

---

## Common Issues & Solutions

### Issue: 404 on `/leave-requests`
✅ **Fixed**: Route alias added

### Issue: Employee ID validation error
✅ **Fixed**: Improved error message with auto-generation guidance

### Issue: "Cannot configure salary structure" error
✅ **Fixed**: Error now includes workflow guidance

### Issue: Lost after 404 error
✅ **Fixed**: 404 page now shows quick links to common pages
