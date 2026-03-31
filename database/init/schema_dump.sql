-- =============================================================================
-- SkyRakSys HRM — Full Schema Dump (Safety Reference)
-- Generated: 2026-03-31 from local development DB
-- Source: All 25 migrations applied on local PostgreSQL 17
-- =============================================================================
--
-- PURPOSE:
--   This file is a snapshot of the EXACT schema running locally.
--   It is used as a verification reference and emergency fallback only.
--   DO NOT use this to init production — use Sequelize migrations instead:
--     npx sequelize-cli db:migrate
--
-- TABLES (22 + SequelizeMeta):
--   users, employees, departments, positions, refresh_tokens
--   leave_types, leave_balances, leave_requests
--   projects, tasks, timesheets
--   salary_structures, payslip_templates, payroll_data, payslips, payslip_audit_logs
--   attendances, holidays, employee_reviews
--   audit_logs, system_configs, password_reset_tokens
-- =============================================================================
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_attendances_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_attendances_source AS ENUM (
    'manual',
    'biometric',
    'web',
    'mobile'
);


--
-- Name: enum_attendances_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_attendances_status AS ENUM (
    'present',
    'absent',
    'half-day',
    'on-leave',
    'holiday',
    'weekend',
    'late'
);


--
-- Name: enum_employee_reviews_reviewType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_employee_reviews_reviewType" AS ENUM (
    'quarterly',
    'annual',
    'probationary',
    'performance_improvement'
);


--
-- Name: enum_employee_reviews_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_employee_reviews_status AS ENUM (
    'draft',
    'pending_employee_input',
    'pending_approval',
    'completed',
    'archived'
);


--
-- Name: enum_employees_employmentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_employees_employmentType" AS ENUM (
    'Full-time',
    'Part-time',
    'Contract',
    'Intern'
);


--
-- Name: enum_employees_gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_employees_gender AS ENUM (
    'Male',
    'Female',
    'Other'
);


--
-- Name: enum_employees_maritalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_employees_maritalStatus" AS ENUM (
    'Single',
    'Married',
    'Divorced',
    'Widowed'
);


--
-- Name: enum_employees_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_employees_status AS ENUM (
    'Active',
    'Inactive',
    'On Leave',
    'Terminated'
);


--
-- Name: enum_holidays_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_holidays_type AS ENUM (
    'public',
    'restricted',
    'company'
);


--
-- Name: enum_leave_requests_halfDayType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_leave_requests_halfDayType" AS ENUM (
    'First Half',
    'Second Half'
);


--
-- Name: enum_leave_requests_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_leave_requests_status AS ENUM (
    'Pending',
    'Approved',
    'Rejected',
    'Cancelled',
    'Cancellation Requested'
);


--
-- Name: enum_payroll_data_paymentMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."enum_payroll_data_paymentMode" AS ENUM (
    'bank_transfer',
    'cheque',
    'cash',
    'upi'
);


--
-- Name: enum_payroll_data_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_payroll_data_status AS ENUM (
    'draft',
    'calculated',
    'approved',
    'paid',
    'cancelled'
);


--
-- Name: enum_payslip_audit_logs_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_payslip_audit_logs_action AS ENUM (
    'manual_edit',
    'status_change',
    'finalize',
    'mark_paid',
    'regenerate'
);


--
-- Name: enum_payslips_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_payslips_status AS ENUM (
    'draft',
    'finalized',
    'paid',
    'cancelled'
);


--
-- Name: enum_positions_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_positions_level AS ENUM (
    'Entry',
    'Junior',
    'Mid',
    'Senior',
    'Lead',
    'Manager',
    'Director'
);


--
-- Name: enum_projects_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_projects_status AS ENUM (
    'Planning',
    'Active',
    'On Hold',
    'Completed',
    'Cancelled'
);


--
-- Name: enum_tasks_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_tasks_priority AS ENUM (
    'Low',
    'Medium',
    'High',
    'Critical'
);


--
-- Name: enum_tasks_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_tasks_status AS ENUM (
    'Not Started',
    'In Progress',
    'Completed',
    'On Hold'
);


--
-- Name: enum_timesheets_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_timesheets_status AS ENUM (
    'Draft',
    'Submitted',
    'Approved',
    'Rejected'
);


--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_users_role AS ENUM (
    'admin',
    'hr',
    'manager',
    'employee'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: SequelizeMeta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SequelizeMeta" (
    name character varying(255) NOT NULL
);


--
-- Name: attendances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendances (
    id uuid NOT NULL,
    "employeeId" uuid NOT NULL,
    date date NOT NULL,
    "checkIn" timestamp with time zone,
    "checkOut" timestamp with time zone,
    status public.enum_attendances_status DEFAULT 'present'::public.enum_attendances_status NOT NULL,
    "hoursWorked" numeric(5,2) DEFAULT 0,
    "overtimeHours" numeric(5,2) DEFAULT 0,
    "lateMinutes" integer DEFAULT 0,
    "earlyLeaveMinutes" integer DEFAULT 0,
    "breakDuration" integer DEFAULT 0,
    source public.enum_attendances_source DEFAULT 'web'::public.enum_attendances_source,
    notes character varying(500),
    "ipAddress" character varying(45),
    "approvedBy" uuid,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp with time zone
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    action character varying(50) NOT NULL,
    "entityType" character varying(50) NOT NULL,
    "entityId" uuid NOT NULL,
    "userId" uuid,
    "oldValues" jsonb,
    "newValues" jsonb,
    reason text,
    "ipAddress" character varying(45),
    "userAgent" text,
    metadata jsonb DEFAULT '{}'::jsonb,
    duration integer,
    success boolean DEFAULT true NOT NULL,
    "errorMessage" text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_audit_logs_action_values CHECK (((action)::text = ANY ((ARRAY['CREATED'::character varying, 'UPDATED'::character varying, 'DELETED'::character varying, 'RESTORED'::character varying, 'STATUS_CHANGED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'SUBMITTED'::character varying, 'BALANCE_ADJUSTED'::character varying, 'PAYMENT_PROCESSED'::character varying, 'LOGIN_SUCCESS'::character varying, 'LOGIN_FAILED'::character varying, 'LOGOUT'::character varying, 'ACCOUNT_LOCKED_TEMP'::character varying, 'ACCOUNT_LOCKED_MANUAL'::character varying, 'TOKEN_REFRESHED'::character varying, 'TOKEN_REFRESH_FAILED'::character varying, 'PASSWORD_CHANGED'::character varying, 'PASSWORD_RESET_BY_ADMIN'::character varying, 'PASSWORD_RESET_REQUESTED'::character varying, 'PASSWORD_RESET_COMPLETED'::character varying, 'PERMISSION_CHANGED'::character varying, 'EXPORTED'::character varying, 'IMPORTED'::character varying, 'EMAIL_CONFIG_UPDATED'::character varying, 'VIEW_SYSTEM_CONFIG'::character varying, 'UPDATE_SYSTEM_CONFIG'::character varying, 'SYSTEM_CONFIG_ACCESS_GRANTED'::character varying, 'SYSTEM_CONFIG_ACCESS_DENIED'::character varying, 'SYSTEM_CONFIG_PASSWORD_VERIFY_FAILED'::character varying, 'DISTRIBUTED_ATTACK_DETECTED'::character varying, 'TIMESHEET_APPROVED'::character varying, 'TIMESHEET_REJECTED'::character varying, 'TIMESHEET_STATUS_CHANGE'::character varying])::text[])))
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(10),
    description text,
    "parentId" uuid,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    "managerId" uuid
);


--
-- Name: employee_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_reviews (
    id uuid NOT NULL,
    "employeeId" uuid NOT NULL,
    "reviewerId" uuid NOT NULL,
    "reviewPeriod" character varying(255) NOT NULL,
    "reviewType" public."enum_employee_reviews_reviewType" DEFAULT 'quarterly'::public."enum_employee_reviews_reviewType",
    "overallRating" numeric(3,2),
    "technicalSkills" numeric(3,2),
    communication numeric(3,2),
    teamwork numeric(3,2),
    leadership numeric(3,2),
    punctuality numeric(3,2),
    achievements text,
    "areasForImprovement" text,
    goals text,
    "reviewerComments" text,
    "employeeSelfAssessment" text,
    status public.enum_employee_reviews_status DEFAULT 'draft'::public.enum_employee_reviews_status,
    "reviewDate" timestamp with time zone,
    "nextReviewDate" timestamp with time zone,
    "hrApproved" boolean DEFAULT false,
    "hrApprovedBy" uuid,
    "hrApprovedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    CONSTRAINT chk_employee_reviews_communication CHECK (((communication IS NULL) OR ((communication >= 1.0) AND (communication <= 5.0)))),
    CONSTRAINT chk_employee_reviews_leadership CHECK (((leadership IS NULL) OR ((leadership >= 1.0) AND (leadership <= 5.0)))),
    CONSTRAINT chk_employee_reviews_overallrating CHECK ((("overallRating" IS NULL) OR (("overallRating" >= 1.0) AND ("overallRating" <= 5.0)))),
    CONSTRAINT chk_employee_reviews_punctuality CHECK (((punctuality IS NULL) OR ((punctuality >= 1.0) AND (punctuality <= 5.0)))),
    CONSTRAINT chk_employee_reviews_teamwork CHECK (((teamwork IS NULL) OR ((teamwork >= 1.0) AND (teamwork <= 5.0)))),
    CONSTRAINT chk_employee_reviews_technicalskills CHECK ((("technicalSkills" IS NULL) OR (("technicalSkills" >= 1.0) AND ("technicalSkills" <= 5.0))))
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid NOT NULL,
    "employeeId" character varying(255) NOT NULL,
    "firstName" character varying(255) NOT NULL,
    "lastName" character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(255),
    "hireDate" date NOT NULL,
    status public.enum_employees_status DEFAULT 'Active'::public.enum_employees_status,
    "aadhaarNumber" character varying(255),
    "panNumber" character varying(255),
    "uanNumber" character varying(255),
    "pfNumber" character varying(255),
    "esiNumber" character varying(255),
    "bankName" character varying(255),
    "bankAccountNumber" character varying(255),
    "ifscCode" character varying(255),
    "bankBranch" character varying(255),
    "accountHolderName" character varying(255),
    address text,
    city character varying(255),
    state character varying(255),
    "pinCode" character varying(255),
    "emergencyContactName" character varying(255),
    "emergencyContactPhone" character varying(255),
    "emergencyContactRelation" character varying(255),
    "dateOfBirth" date,
    gender public.enum_employees_gender,
    "photoUrl" character varying(255),
    "maritalStatus" public."enum_employees_maritalStatus",
    nationality character varying(255) DEFAULT 'Indian'::character varying,
    "workLocation" character varying(255),
    "employmentType" public."enum_employees_employmentType" DEFAULT 'Full-time'::public."enum_employees_employmentType",
    "joiningDate" date,
    "confirmationDate" date,
    "resignationDate" date,
    "lastWorkingDate" date,
    "probationPeriod" integer DEFAULT 6,
    "noticePeriod" integer DEFAULT 30,
    salary json,
    "userId" uuid,
    "departmentId" uuid,
    "positionId" uuid,
    "managerId" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    country character varying(255) DEFAULT 'India'::character varying
);


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holidays (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    date date NOT NULL,
    type public.enum_holidays_type DEFAULT 'public'::public.enum_holidays_type NOT NULL,
    year integer NOT NULL,
    "isRecurring" boolean DEFAULT false,
    description character varying(500),
    "isActive" boolean DEFAULT true,
    "createdBy" uuid,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: leave_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_balances (
    id uuid NOT NULL,
    "employeeId" uuid NOT NULL,
    "leaveTypeId" uuid NOT NULL,
    year integer NOT NULL,
    "totalAccrued" numeric(5,2) DEFAULT 0,
    "totalTaken" numeric(5,2) DEFAULT 0,
    "totalPending" numeric(5,2) DEFAULT 0,
    balance numeric(5,2) DEFAULT 0,
    "carryForward" numeric(5,2) DEFAULT 0,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone
);


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid NOT NULL,
    "employeeId" uuid NOT NULL,
    "leaveTypeId" uuid NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    "totalDays" numeric(4,1) NOT NULL,
    reason text NOT NULL,
    status public.enum_leave_requests_status DEFAULT 'Pending'::public.enum_leave_requests_status,
    "approvedBy" uuid,
    "approvedAt" timestamp with time zone,
    "rejectedAt" timestamp with time zone,
    "approverComments" text,
    "rejectionReason" text,
    "employeeComments" text,
    attachments text,
    "isHalfDay" boolean DEFAULT false,
    "halfDayType" public."enum_leave_requests_halfDayType",
    "isCancellation" boolean DEFAULT false,
    "originalLeaveRequestId" uuid,
    "cancellationNote" text,
    "cancelledAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    CONSTRAINT chk_leave_requests_date_range CHECK (("endDate" >= "startDate"))
);


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_types (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    "maxDaysPerYear" integer DEFAULT 20,
    "carryForward" boolean DEFAULT false,
    "maxCarryForwardDays" integer DEFAULT 0,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    "isPaid" boolean DEFAULT true NOT NULL
);


--
-- Name: COLUMN leave_types."isPaid"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leave_types."isPaid" IS 'Whether this leave type is paid (true) or results in LOP deduction (false)';


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid NOT NULL,
    "tokenId" character varying(64) NOT NULL,
    "userId" uuid NOT NULL,
    email character varying(255) NOT NULL,
    "usedAt" timestamp with time zone,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payroll_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_data (
    "employeeId" uuid NOT NULL,
    "payPeriod" character varying(255) NOT NULL,
    "payPeriodStart" date NOT NULL,
    "payPeriodEnd" date NOT NULL,
    "totalWorkingDays" integer DEFAULT 21 NOT NULL,
    "presentDays" integer DEFAULT 21 NOT NULL,
    "absentDays" integer DEFAULT 0,
    "lopDays" integer DEFAULT 0,
    "paidDays" integer DEFAULT 0,
    "overtimeHours" numeric(5,2) DEFAULT 0,
    "weeklyOffDays" integer DEFAULT 0,
    holidays integer DEFAULT 0,
    "variableEarnings" json DEFAULT '{"performanceBonus":0,"overtimeAllowance":0,"arrears":0,"incentive":0,"specialBonus":0}'::json,
    "variableDeductions" json DEFAULT '{"loanEmi":0,"advances":0,"canteenCharges":0,"otherDeductions":0,"lateFine":0}'::json,
    "leaveAdjustments" json DEFAULT '{"leaveEncashment":0,"leaveWithoutPay":0}'::json,
    "grossSalary" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalDeductions" numeric(10,2) DEFAULT 0 NOT NULL,
    "netSalary" numeric(10,2) DEFAULT 0 NOT NULL,
    "paymentMode" public."enum_payroll_data_paymentMode" DEFAULT 'bank_transfer'::public."enum_payroll_data_paymentMode",
    "disbursementDate" date,
    status public.enum_payroll_data_status DEFAULT 'draft'::public.enum_payroll_data_status,
    "approvedBy" uuid,
    "approvedAt" timestamp with time zone,
    "approvalComments" text,
    "createdBy" uuid NOT NULL,
    "updatedBy" uuid,
    "calculationNotes" text,
    "templateUsed" character varying(255) DEFAULT 'default'::character varying,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    CONSTRAINT chk_payroll_data_deductions_positive CHECK (("totalDeductions" >= (0)::numeric)),
    CONSTRAINT chk_payroll_data_gross_positive CHECK (("grossSalary" >= (0)::numeric)),
    CONSTRAINT chk_payroll_data_net_positive CHECK (("netSalary" >= (0)::numeric))
);


--
-- Name: payslip_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payslip_audit_logs (
    "payslipId" uuid NOT NULL,
    action public.enum_payslip_audit_logs_action NOT NULL,
    "performedBy" uuid NOT NULL,
    reason text,
    changes jsonb,
    "ipAddress" character varying(45),
    "userAgent" text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid()
);


--
-- Name: payslip_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payslip_templates (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    "isDefault" boolean DEFAULT false,
    "isActive" boolean DEFAULT true,
    "headerFields" json DEFAULT '[]'::json,
    "earningsFields" json DEFAULT '[]'::json,
    "deductionsFields" json DEFAULT '[]'::json,
    "footerFields" json DEFAULT '[]'::json,
    styling json DEFAULT '{}'::json,
    "createdBy" uuid,
    "updatedBy" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payslips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payslips (
    id uuid NOT NULL,
    "employeeId" uuid NOT NULL,
    "payPeriod" character varying(255) NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    "payPeriodStart" date NOT NULL,
    "payPeriodEnd" date NOT NULL,
    "templateId" uuid,
    "templateVersion" character varying(255) DEFAULT '1.0'::character varying,
    "employeeInfo" json NOT NULL,
    "companyInfo" json NOT NULL,
    earnings json DEFAULT '{}'::json NOT NULL,
    deductions json DEFAULT '{}'::json NOT NULL,
    attendance json DEFAULT '{"totalWorkingDays":21,"presentDays":21,"absentDays":0,"lopDays":0,"paidDays":21,"overtimeHours":0}'::json NOT NULL,
    "grossEarnings" numeric(12,2) DEFAULT 0 NOT NULL,
    "totalDeductions" numeric(12,2) DEFAULT 0 NOT NULL,
    "netPay" numeric(12,2) DEFAULT 0 NOT NULL,
    "netPayInWords" text,
    "payslipNumber" character varying(50) NOT NULL,
    "payDate" timestamp with time zone DEFAULT now() NOT NULL,
    "generatedDate" timestamp with time zone DEFAULT now() NOT NULL,
    "generatedBy" uuid,
    status public.enum_payslips_status DEFAULT 'draft'::public.enum_payslips_status NOT NULL,
    "calculationDetails" json,
    "pdfMetadata" json,
    "additionalData" json,
    version integer DEFAULT 1 NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "manuallyEdited" boolean DEFAULT false NOT NULL,
    "lastEditedBy" uuid,
    "lastEditedAt" timestamp with time zone,
    "finalizedAt" timestamp with time zone,
    "finalizedBy" uuid,
    "paidAt" timestamp with time zone,
    "paidBy" uuid,
    "paymentMethod" character varying(50),
    "paymentReference" character varying(100),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    "payrollDataId" uuid NOT NULL
);


--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    code character varying(50),
    description text,
    level public.enum_positions_level DEFAULT 'Entry'::public.enum_positions_level,
    "departmentId" uuid NOT NULL,
    "minSalary" numeric(10,2),
    "maxSalary" numeric(10,2),
    responsibilities text,
    requirements text,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    CONSTRAINT chk_positions_max_salary_positive CHECK ((("maxSalary" IS NULL) OR ("maxSalary" >= (0)::numeric))),
    CONSTRAINT chk_positions_min_salary_positive CHECK ((("minSalary" IS NULL) OR ("minSalary" >= (0)::numeric))),
    CONSTRAINT chk_positions_salary_range CHECK ((("maxSalary" IS NULL) OR ("minSalary" IS NULL) OR ("maxSalary" >= "minSalary")))
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    "startDate" date,
    "endDate" date,
    status public.enum_projects_status DEFAULT 'Planning'::public.enum_projects_status,
    "clientName" character varying(255),
    "managerId" uuid,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    token text NOT NULL,
    "userId" uuid NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "isRevoked" boolean DEFAULT false,
    "revokedAt" timestamp with time zone,
    "userAgent" text,
    "ipAddress" character varying(255),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: salary_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_structures (
    id uuid NOT NULL,
    "employeeId" uuid NOT NULL,
    "basicSalary" numeric(10,2) NOT NULL,
    hra numeric(10,2) DEFAULT 0,
    allowances numeric(10,2) DEFAULT 0,
    "pfContribution" numeric(10,2) DEFAULT 0,
    tds numeric(10,2) DEFAULT 0,
    "professionalTax" numeric(10,2) DEFAULT 0,
    "otherDeductions" numeric(10,2) DEFAULT 0,
    currency character varying(255) DEFAULT 'INR'::character varying,
    "effectiveFrom" date NOT NULL,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    esi numeric(10,2) DEFAULT 0,
    CONSTRAINT chk_salary_structures_basic_positive CHECK (("basicSalary" >= (0)::numeric)),
    CONSTRAINT chk_salary_structures_hra_positive CHECK (((hra IS NULL) OR (hra >= (0)::numeric)))
);


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    id uuid NOT NULL,
    category character varying(50) NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "changedBy" uuid NOT NULL,
    description text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    "estimatedHours" numeric(5,2),
    "actualHours" numeric(5,2) DEFAULT 0,
    status public.enum_tasks_status DEFAULT 'Not Started'::public.enum_tasks_status,
    priority public.enum_tasks_priority DEFAULT 'Medium'::public.enum_tasks_priority,
    "availableToAll" boolean DEFAULT false,
    "projectId" uuid NOT NULL,
    "assignedTo" uuid,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    "dueDate" timestamp with time zone
);


--
-- Name: timesheets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timesheets (
    id uuid NOT NULL,
    "employeeId" uuid NOT NULL,
    "projectId" uuid NOT NULL,
    "taskId" uuid NOT NULL,
    "weekStartDate" date NOT NULL,
    "weekEndDate" date NOT NULL,
    "weekNumber" integer NOT NULL,
    year integer NOT NULL,
    "totalHoursWorked" numeric(5,2) DEFAULT 0 NOT NULL,
    "mondayHours" numeric(4,2) DEFAULT 0,
    "tuesdayHours" numeric(4,2) DEFAULT 0,
    "wednesdayHours" numeric(4,2) DEFAULT 0,
    "thursdayHours" numeric(4,2) DEFAULT 0,
    "fridayHours" numeric(4,2) DEFAULT 0,
    "saturdayHours" numeric(4,2) DEFAULT 0,
    "sundayHours" numeric(4,2) DEFAULT 0,
    description text,
    status public.enum_timesheets_status DEFAULT 'Draft'::public.enum_timesheets_status,
    "submittedAt" timestamp with time zone,
    "approvedAt" timestamp with time zone,
    "rejectedAt" timestamp with time zone,
    "approverComments" text,
    "approvedBy" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    "rejectedBy" uuid,
    CONSTRAINT chk_timesheets_friday_hours CHECK ((("fridayHours" >= (0)::numeric) AND ("fridayHours" <= (24)::numeric))),
    CONSTRAINT chk_timesheets_monday_hours CHECK ((("mondayHours" >= (0)::numeric) AND ("mondayHours" <= (24)::numeric))),
    CONSTRAINT chk_timesheets_saturday_hours CHECK ((("saturdayHours" >= (0)::numeric) AND ("saturdayHours" <= (24)::numeric))),
    CONSTRAINT chk_timesheets_sunday_hours CHECK ((("sundayHours" >= (0)::numeric) AND ("sundayHours" <= (24)::numeric))),
    CONSTRAINT chk_timesheets_thursday_hours CHECK ((("thursdayHours" >= (0)::numeric) AND ("thursdayHours" <= (24)::numeric))),
    CONSTRAINT chk_timesheets_total_hours CHECK (("totalHoursWorked" >= (0)::numeric)),
    CONSTRAINT chk_timesheets_tuesday_hours CHECK ((("tuesdayHours" >= (0)::numeric) AND ("tuesdayHours" <= (24)::numeric))),
    CONSTRAINT chk_timesheets_wednesday_hours CHECK ((("wednesdayHours" >= (0)::numeric) AND ("wednesdayHours" <= (24)::numeric))),
    CONSTRAINT chk_timesheets_week_date_range CHECK (("weekEndDate" >= "weekStartDate"))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    "firstName" character varying(255) NOT NULL,
    "lastName" character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role public.enum_users_role DEFAULT 'employee'::public.enum_users_role NOT NULL,
    "isActive" boolean DEFAULT true,
    "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
    "lockoutUntil" timestamp with time zone,
    "lastLoginAt" timestamp with time zone,
    "passwordChangedAt" timestamp with time zone,
    "emailVerifiedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone
);


--
-- Name: SequelizeMeta SequelizeMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SequelizeMeta"
    ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name);


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: employee_reviews employee_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_reviews
    ADD CONSTRAINT employee_reviews_pkey PRIMARY KEY (id);


--
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- Name: employees employees_employeeId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_employeeId_key" UNIQUE ("employeeId");


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: leave_balances leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_types leave_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_name_key UNIQUE (name);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_tokenId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "password_reset_tokens_tokenId_key" UNIQUE ("tokenId");


--
-- Name: payroll_data payroll_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_data
    ADD CONSTRAINT payroll_data_pkey PRIMARY KEY (id);


--
-- Name: payslip_templates payslip_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslip_templates
    ADD CONSTRAINT payslip_templates_pkey PRIMARY KEY (id);


--
-- Name: payslips payslips_payslipNumber_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT "payslips_payslipNumber_key" UNIQUE ("payslipNumber");


--
-- Name: payslips payslips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_pkey PRIMARY KEY (id);


--
-- Name: positions positions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_code_key UNIQUE (code);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: salary_structures salary_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: timesheets timesheets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT timesheets_pkey PRIMARY KEY (id);


--
-- Name: payslip_templates uq_payslip_templates_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslip_templates
    ADD CONSTRAINT uq_payslip_templates_name UNIQUE (name);


--
-- Name: projects uq_projects_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT uq_projects_name UNIQUE (name);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: attendances_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendances_date ON public.attendances USING btree (date);


--
-- Name: attendances_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendances_status ON public.attendances USING btree (status);


--
-- Name: holidays_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX holidays_date ON public.holidays USING btree (date);


--
-- Name: holidays_date_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX holidays_date_name_unique ON public.holidays USING btree (date, name);


--
-- Name: holidays_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX holidays_year ON public.holidays USING btree (year);


--
-- Name: idx_attendance_emp_date_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_emp_date_status ON public.attendances USING btree ("employeeId", date, status);


--
-- Name: idx_attendance_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_attendance_employee_date ON public.attendances USING btree ("employeeId", date);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree ("createdAt");


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: idx_audit_logs_entity_type_action_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_type_action_created ON public.audit_logs USING btree ("entityType", action, "createdAt");


--
-- Name: idx_audit_logs_entity_type_id_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity_type_id_created ON public.audit_logs USING btree ("entityType", "entityId", "createdAt");


--
-- Name: idx_audit_logs_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_success ON public.audit_logs USING btree (success);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree ("userId");


--
-- Name: idx_audit_logs_user_action_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_action_created ON public.audit_logs USING btree ("userId", action, "createdAt");


--
-- Name: idx_departments_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_is_active ON public.departments USING btree ("isActive");


--
-- Name: idx_departments_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_name ON public.departments USING btree (name);


--
-- Name: idx_employee_reviews_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_reviews_employee ON public.employee_reviews USING btree ("employeeId");


--
-- Name: idx_employee_reviews_review_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_reviews_review_period ON public.employee_reviews USING btree ("reviewPeriod");


--
-- Name: idx_employee_reviews_reviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_reviews_reviewer ON public.employee_reviews USING btree ("reviewerId");


--
-- Name: idx_employee_reviews_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_reviews_status ON public.employee_reviews USING btree (status);


--
-- Name: idx_employees_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_created_at ON public.employees USING btree ("createdAt") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_employees_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_department ON public.employees USING btree ("departmentId");


--
-- Name: idx_employees_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_department_id ON public.employees USING btree ("departmentId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_employees_department_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_department_status ON public.employees USING btree ("departmentId", status);


--
-- Name: idx_employees_dept_pos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_dept_pos ON public.employees USING btree ("departmentId", "positionId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_employees_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_email ON public.employees USING btree (email) WHERE ("deletedAt" IS NULL);


--
-- Name: idx_employees_empid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_employees_empid ON public.employees USING btree ("employeeId");


--
-- Name: idx_employees_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_employee_id ON public.employees USING btree ("employeeId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_employees_employment_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_employment_type ON public.employees USING btree ("employmentType") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_employees_hire_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_hire_date ON public.employees USING btree ("hireDate") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_employees_manager; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_manager ON public.employees USING btree ("managerId");


--
-- Name: idx_employees_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_manager_id ON public.employees USING btree ("managerId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_employees_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_position ON public.employees USING btree ("positionId");


--
-- Name: idx_employees_position_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_position_id ON public.employees USING btree ("positionId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_status ON public.employees USING btree (status) WHERE ("deletedAt" IS NULL);


--
-- Name: idx_employees_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_user ON public.employees USING btree ("userId");


--
-- Name: idx_employees_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_user_id ON public.employees USING btree ("userId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_leave_balances_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_balances_employee_id ON public.leave_balances USING btree ("employeeId");


--
-- Name: idx_leave_balances_leave_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_balances_leave_type_id ON public.leave_balances USING btree ("leaveTypeId");


--
-- Name: idx_leave_balances_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_leave_balances_unique ON public.leave_balances USING btree ("employeeId", "leaveTypeId", year);


--
-- Name: idx_leave_balances_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_balances_year ON public.leave_balances USING btree (year);


--
-- Name: idx_leave_requests_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_approved_by ON public.leave_requests USING btree ("approvedBy");


--
-- Name: idx_leave_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_created_at ON public.leave_requests USING btree ("createdAt") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_leave_requests_date_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_date_range ON public.leave_requests USING btree ("startDate", "endDate") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_leave_requests_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_dates ON public.leave_requests USING btree ("startDate", "endDate");


--
-- Name: idx_leave_requests_emp_status_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_emp_status_start ON public.leave_requests USING btree ("employeeId", status, "startDate");


--
-- Name: idx_leave_requests_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_employee ON public.leave_requests USING btree ("employeeId");


--
-- Name: idx_leave_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_employee_id ON public.leave_requests USING btree ("employeeId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_leave_requests_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_end_date ON public.leave_requests USING btree ("endDate") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_leave_requests_leave_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_leave_type_id ON public.leave_requests USING btree ("leaveTypeId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_leave_requests_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_start_date ON public.leave_requests USING btree ("startDate") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_leave_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_status ON public.leave_requests USING btree (status);


--
-- Name: idx_leave_requests_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_type ON public.leave_requests USING btree ("leaveTypeId");


--
-- Name: idx_leave_types_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_types_deleted_at ON public.leave_types USING btree ("deletedAt");


--
-- Name: idx_leave_types_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_types_is_active ON public.leave_types USING btree ("isActive") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_leave_types_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_types_name ON public.leave_types USING btree (name) WHERE ("deletedAt" IS NULL);


--
-- Name: idx_password_reset_tokens_user_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_expires ON public.password_reset_tokens USING btree ("userId", "expiresAt");


--
-- Name: idx_payroll_data_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_data_employee_id ON public.payroll_data USING btree ("employeeId");


--
-- Name: idx_payroll_data_pay_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_data_pay_period ON public.payroll_data USING btree ("payPeriod");


--
-- Name: idx_payroll_data_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_data_status ON public.payroll_data USING btree (status);


--
-- Name: idx_payroll_data_status_pay_period_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_data_status_pay_period_start ON public.payroll_data USING btree (status, "payPeriodStart");


--
-- Name: idx_payroll_data_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payroll_data_unique ON public.payroll_data USING btree ("employeeId", "payPeriod");


--
-- Name: idx_payslip_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslip_audit_logs_action ON public.payslip_audit_logs USING btree (action);


--
-- Name: idx_payslip_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslip_audit_logs_created_at ON public.payslip_audit_logs USING btree ("createdAt");


--
-- Name: idx_payslip_audit_payslip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslip_audit_payslip ON public.payslip_audit_logs USING btree ("payslipId");


--
-- Name: idx_payslip_audit_performer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslip_audit_performer ON public.payslip_audit_logs USING btree ("performedBy");


--
-- Name: idx_payslip_templates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslip_templates_active ON public.payslip_templates USING btree ("isActive");


--
-- Name: idx_payslip_templates_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslip_templates_default ON public.payslip_templates USING btree ("isDefault");


--
-- Name: idx_payslip_templates_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslip_templates_name ON public.payslip_templates USING btree (name);


--
-- Name: idx_payslips_emp_period; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payslips_emp_period ON public.payslips USING btree ("employeeId", month, year);


--
-- Name: idx_payslips_employee_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslips_employee_status ON public.payslips USING btree ("employeeId", status);


--
-- Name: idx_payslips_generated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslips_generated_by ON public.payslips USING btree ("generatedBy");


--
-- Name: idx_payslips_is_locked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslips_is_locked ON public.payslips USING btree ("isLocked");


--
-- Name: idx_payslips_month_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslips_month_year ON public.payslips USING btree (month, year);


--
-- Name: idx_payslips_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payslips_number ON public.payslips USING btree ("payslipNumber");


--
-- Name: idx_payslips_payroll_data_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslips_payroll_data_id ON public.payslips USING btree ("payrollDataId");


--
-- Name: idx_payslips_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslips_status ON public.payslips USING btree (status);


--
-- Name: idx_payslips_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslips_template_id ON public.payslips USING btree ("templateId");


--
-- Name: idx_positions_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_department ON public.positions USING btree ("departmentId");


--
-- Name: idx_positions_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_department_id ON public.positions USING btree ("departmentId");


--
-- Name: idx_positions_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_is_active ON public.positions USING btree ("isActive");


--
-- Name: idx_positions_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_title ON public.positions USING btree (title);


--
-- Name: idx_projects_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_deleted_at ON public.projects USING btree ("deletedAt");


--
-- Name: idx_projects_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_end_date ON public.projects USING btree ("endDate") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_projects_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_is_active ON public.projects USING btree ("isActive") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_projects_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_manager_id ON public.projects USING btree ("managerId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_projects_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_start_date ON public.projects USING btree ("startDate") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status) WHERE ("deletedAt" IS NULL);


--
-- Name: idx_refresh_tokens_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_expires ON public.refresh_tokens USING btree ("expiresAt");


--
-- Name: idx_refresh_tokens_is_revoked_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_is_revoked_expires_at ON public.refresh_tokens USING btree ("isRevoked", "expiresAt");


--
-- Name: idx_refresh_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree ("userId");


--
-- Name: idx_salary_structures_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_structures_deleted_at ON public.salary_structures USING btree ("deletedAt");


--
-- Name: idx_salary_structures_effective_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_structures_effective_from ON public.salary_structures USING btree ("effectiveFrom") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_salary_structures_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_structures_employee ON public.salary_structures USING btree ("employeeId");


--
-- Name: idx_salary_structures_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_structures_employee_id ON public.salary_structures USING btree ("employeeId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_salary_structures_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_salary_structures_is_active ON public.salary_structures USING btree ("isActive") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_system_configs_cat_key_ver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_cat_key_ver ON public.system_configs USING btree (category, key, version);


--
-- Name: idx_system_configs_category_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_category_key ON public.system_configs USING btree (category, key);


--
-- Name: idx_system_configs_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_changed_by ON public.system_configs USING btree ("changedBy");


--
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree ("assignedTo") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_tasks_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assignee ON public.tasks USING btree ("assignedTo");


--
-- Name: idx_tasks_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_deleted_at ON public.tasks USING btree ("deletedAt");


--
-- Name: idx_tasks_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_is_active ON public.tasks USING btree ("isActive") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_tasks_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority) WHERE ("deletedAt" IS NULL);


--
-- Name: idx_tasks_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project ON public.tasks USING btree ("projectId");


--
-- Name: idx_tasks_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project_id ON public.tasks USING btree ("projectId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status) WHERE ("deletedAt" IS NULL);


--
-- Name: idx_timesheets_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_approved_by ON public.timesheets USING btree ("approvedBy") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_timesheets_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_created_at ON public.timesheets USING btree ("createdAt") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_timesheets_date_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_date_range ON public.timesheets USING btree ("weekStartDate", "weekEndDate");


--
-- Name: idx_timesheets_emp_week; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_emp_week ON public.timesheets USING btree ("employeeId", "weekStartDate") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_timesheets_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_employee_id ON public.timesheets USING btree ("employeeId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_timesheets_employee_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_employee_status ON public.timesheets USING btree ("employeeId", status);


--
-- Name: idx_timesheets_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_project_id ON public.timesheets USING btree ("projectId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_timesheets_project_week; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_project_week ON public.timesheets USING btree ("projectId", "weekStartDate");


--
-- Name: idx_timesheets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_status ON public.timesheets USING btree (status) WHERE ("deletedAt" IS NULL);


--
-- Name: idx_timesheets_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_task_id ON public.timesheets USING btree ("taskId") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_timesheets_week_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timesheets_week_start_date ON public.timesheets USING btree ("weekStartDate") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_active ON public.users USING btree ("isActive");


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email) WHERE ("deletedAt" IS NULL);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_active ON public.users USING btree ("isActive") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_login ON public.users USING btree ("lastLoginAt") WHERE ("deletedAt" IS NULL);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role) WHERE ("deletedAt" IS NULL);


--
-- Name: prt_email_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prt_email_created_at ON public.password_reset_tokens USING btree (email, "createdAt");


--
-- Name: prt_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prt_expires_at ON public.password_reset_tokens USING btree ("expiresAt");


--
-- Name: prt_token_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX prt_token_id_unique ON public.password_reset_tokens USING btree ("tokenId");


--
-- Name: uq_employee_reviews_employee_period; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_employee_reviews_employee_period ON public.employee_reviews USING btree ("employeeId", "reviewPeriod");


--
-- Name: uq_salary_structures_employee_effective; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_salary_structures_employee_effective ON public.salary_structures USING btree ("employeeId", "effectiveFrom");


--
-- Name: uq_system_configs_category_key_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_system_configs_category_key_version ON public.system_configs USING btree (category, key, version);


--
-- Name: uq_timesheets_employee_week_project_task; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_timesheets_employee_week_project_task ON public.timesheets USING btree ("employeeId", "weekStartDate", "projectId", "taskId");


--
-- Name: attendances attendances_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "attendances_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: attendances attendances_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: departments departments_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: departments departments_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_reviews employee_reviews_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_reviews
    ADD CONSTRAINT "employee_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_reviews employee_reviews_hrApprovedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_reviews
    ADD CONSTRAINT "employee_reviews_hrApprovedBy_fkey" FOREIGN KEY ("hrApprovedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_reviews employee_reviews_reviewerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_reviews
    ADD CONSTRAINT "employee_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employees employees_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_positionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES public.positions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: holidays holidays_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT "holidays_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leave_balances leave_balances_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT "leave_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leave_balances leave_balances_leaveTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_balances
    ADD CONSTRAINT "leave_balances_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES public.leave_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "leave_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_leaveTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "leave_requests_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES public.leave_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: leave_requests leave_requests_originalLeaveRequestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "leave_requests_originalLeaveRequestId_fkey" FOREIGN KEY ("originalLeaveRequestId") REFERENCES public.leave_requests(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payroll_data payroll_data_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_data
    ADD CONSTRAINT "payroll_data_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payroll_data payroll_data_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_data
    ADD CONSTRAINT "payroll_data_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_data payroll_data_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_data
    ADD CONSTRAINT "payroll_data_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payroll_data payroll_data_updatedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_data
    ADD CONSTRAINT "payroll_data_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payslip_audit_logs payslip_audit_logs_payslipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslip_audit_logs
    ADD CONSTRAINT "payslip_audit_logs_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES public.payslips(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payslip_audit_logs payslip_audit_logs_performedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslip_audit_logs
    ADD CONSTRAINT "payslip_audit_logs_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payslip_templates payslip_templates_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslip_templates
    ADD CONSTRAINT "payslip_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payslip_templates payslip_templates_updatedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslip_templates
    ADD CONSTRAINT "payslip_templates_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payslips payslips_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payslips payslips_finalizedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT "payslips_finalizedBy_fkey" FOREIGN KEY ("finalizedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payslips payslips_generatedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT "payslips_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payslips payslips_lastEditedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT "payslips_lastEditedBy_fkey" FOREIGN KEY ("lastEditedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payslips payslips_paidBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT "payslips_paidBy_fkey" FOREIGN KEY ("paidBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payslips payslips_payrollDataId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT "payslips_payrollDataId_fkey" FOREIGN KEY ("payrollDataId") REFERENCES public.payroll_data(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payslips payslips_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT "payslips_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.payslip_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: positions positions_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT "positions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: projects projects_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: refresh_tokens refresh_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: salary_structures salary_structures_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT "salary_structures_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: system_configs system_configs_changedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT "system_configs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tasks tasks_assignedTo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "tasks_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasks tasks_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: timesheets timesheets_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT "timesheets_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: timesheets timesheets_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT "timesheets_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: timesheets timesheets_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT "timesheets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: timesheets timesheets_rejectedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT "timesheets_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: timesheets timesheets_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT "timesheets_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

