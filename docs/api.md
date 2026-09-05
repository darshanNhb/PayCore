# PayCore — REST API Reference

All endpoints return JSON. Successful list endpoints follow the envelope `{ data: [...], page, pageSize, total }`. Single-resource endpoints return `{ data: {...} }`. Error responses return `{ error: { code: string, message: string, details?: any } }`.

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login`
- **Access**: Public
- **Body**: `{ email: string, password: string }`
- **Response**: Sets `paycore_access_token` (15m) and `paycore_refresh_token` (30d) httpOnly cookies. Returns `{ user: { id, email, firstName, lastName, role, employeeId } }`.

### `POST /api/auth/logout`
- **Access**: Authenticated
- **Response**: Clears cookies, blacklists token jti in Redis.

### `POST /api/auth/refresh`
- **Access**: Requires valid `paycore_refresh_token` cookie
- **Response**: Issues new access token cookie.

### `GET /api/auth/me`
- **Access**: Authenticated
- **Response**: Current session user and linked employee metadata.

---

## 2. Organization & Master Data

### `GET /api/departments`
- **Access**: Authenticated
- **Response**: List of active departments with child departments and manager employee.

### `POST /api/departments`
- **Access**: HR Manager / Admin (`employee:create`)
- **Body**: `{ name: string, parentDepartmentId?: string, managerEmployeeId?: string }`

### `GET /api/job-positions?departmentId=`
- **Access**: Authenticated
- **Response**: List of job positions, optionally filtered by department.

### `POST /api/job-positions`
- **Access**: HR Manager / Admin
- **Body**: `{ title: string, departmentId?: string }`

---

## 3. Employees (`/api/employees`)

### `GET /api/employees`
- **Access**: Authenticated
- **Query Params**: `search`, `departmentId`, `status`, `employeeType`, `page`, `pageSize`
- **Response**: Paginated employee list with department, manager, and running contract wage.

### `POST /api/employees`
- **Access**: HR Manager / Admin (`employee:create`)
- **Body**:
  ```json
  {
    "firstName": "Aarav",
    "lastName": "Mehta",
    "workEmail": "aarav.mehta@paycore.in",
    "dateOfJoining": "2026-04-01",
    "departmentId": "uuid",
    "jobPositionId": "uuid",
    "managerId": "uuid",
    "employeeType": "FULL_TIME",
    "bankAccountNumber": "5010023456789",
    "bankIfsc": "HDFC0001234",
    "pan": "ABCDE1234F"
  }
  ```
- **Behavior**: Auto-generates `EMP/YYYY/XXXX` code. Encrypts bank details and PAN via AES-256-GCM. Writes audit log.

### `GET /api/employees/:id`
- **Access**: HR/Payroll staff or self (owner employee)
- **Response**: Full profile with masked bank details (`••••••••4812`).

### `GET /api/employees/:id/summary`
- **Access**: Authenticated
- **Response**: Counts for profile smart tiles: `{ contractsCount, attendanceThisMonth, timeOffRequestsCount, activeAllocationsCount }`.

---

## 4. Contracts (`/api/contracts`)

### `GET /api/contracts?employeeId=&status=`
- **Access**: HR/Payroll staff or self

### `POST /api/contracts`
- **Access**: HR Manager / Admin (`contract:create`)
- **Body**: `{ employeeId, salaryStructureId, wagePerMonth, startDate, endDate?, status }`
- **Business Rule**: Enforces no two contracts for the same employee have overlapping date ranges while both are in `RUNNING` status (returns 409 Conflict if violated).

---

## 5. Working Schedules (`/api/working-schedules`)

### `GET /api/working-schedules`
- **Access**: Authenticated
- **Response**: Schedules with slots and auto-calculated `totalWeeklyHours`.

### `PUT /api/working-schedules/:id/slots`
- **Access**: HR Manager / Admin
- **Body**: Array of slots `[{ dayOfWeek: 1, startTime: "09:30", endTime: "18:30", breakMinutes: 60 }]`
- **Response**: Replaces all weekly slots atomically and returns server-recomputed `totalWeeklyHours`.

---

## 6. Attendance (`/api/attendance`)

### `POST /api/attendance/check-in`
- **Access**: Self-service (current employee)
- **Behavior**: Starts session, evaluates slot start time, marks `LATE` if >15m grace period.

### `POST /api/attendance/check-out`
- **Access**: Self-service
- **Behavior**: Records check-out timestamp, calculates `workedMinutes`.

### `GET /api/attendance/status`
- **Access**: Self-service
- **Response**: `{ checkedIn: boolean, elapsedSeconds: number, checkInTime: string }`.

### `POST /api/attendance`
- **Access**: HR / Payroll staff
- **Body**: Manual attendance record creation with mandatory `correctionReason`.

---

## 7. Time Off (`/api/time-off`)

### `GET /api/time-off/types`
- **Response**: Configured leave types (Earned Leave, Sick Leave, WFH).

### `GET /api/time-off/allocations?employeeId=`
- **Response**: Annual allocations with remaining balances.

### `POST /api/time-off/requests`
- **Access**: Self-service or HR
- **Body**: `{ timeOffTypeId, startDate, endDate, durationAmount, reason }`

### `POST /api/time-off/requests/:id/approve`
- **Access**: HR Manager / Admin (`time_off_request:approve`)
- **Business Rule**: Atomically verifies `remainingAmount >= durationAmount`, increments allocation `takenAmount`, marks `APPROVED`, writes audit log.

### `POST /api/time-off/requests/:id/refuse`
- **Access**: HR Manager / Admin
- **Business Rule**: If previously approved, symmetrically reverses allocation `takenAmount`.

---

## 8. Payroll Configuration (`/api/payroll`)

### `GET|POST /api/payroll/structures`
- Reusable salary structures (e.g. Standard INR).

### `GET|POST /api/payroll/rules?structureId=`
- Salary rules with computation methods (`FIXED_AMOUNT`, `PERCENTAGE_OF_RULE`, `FORMULA`).

### `POST /api/payroll/rules/validate-formula`
- Dry-run validation of formula expressions against a sandboxed scope.

---

## 9. Payruns & Payslips (`/api/payroll/payruns`)

### `POST /api/payroll/payruns/draft-scope`
- **Step 1 of wizard**: Returns eligible employees covering the period with running contracts without database persistence.

### `POST /api/payroll/payruns`
- **Step 2 of wizard**: Accepts scope + confirmed `employeeIds`. Transactionally creates Payrun and DRAFT payslips.

### `POST /api/payroll/payruns/:id/compute`
- Executes pure payroll engine across all payslips, evaluates rule formulas, updates totals, generates `PayslipWarning`s.

### `POST /api/payroll/payruns/:id/validate`
- Advances payrun and payslips to `VALIDATED`.

### `POST /api/payroll/payruns/:id/mark-paid`
- Enforces zero blocking warnings (missing bank details, negative net pay). Advances to `PAID`.

### `GET /api/payroll/payslips?payrunId=&employeeId=`
- Paginated payslips list.

### `GET /api/payroll/payslips/:id`
- Full breakdown with `PayslipLine`s and warnings.

---

## 10. Dashboard & System

### `GET /api/dashboard?departmentId=`
- Aggregated KPIs, trend chart series, department distribution, and audit activity.

### `GET /api/health`
- Database health check and system status.
