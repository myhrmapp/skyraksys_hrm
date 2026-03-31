"""
SkyrakSys HRM Demo — Voiceover Audio Generator (edge-tts, Male Voice)
=======================================================================
Generates individual MP3 clips for every narration cue using Microsoft
Edge TTS neural voices (en-US-ChristopherNeural — professional male).

Usage:
    python scripts/generate-voiceover.py [--force]

Options:
    --force   Re-generate all clips even if they already exist

Output:
    demo-output/audio/<cue-label>.mp3   — one file per narration cue
    demo-output/audio/clips-manifest.json

Requirements:
    pip install edge-tts
"""

import sys
import json
import asyncio
from pathlib import Path

VOICE = "en-US-ChristopherNeural"   # professional US male neural voice

# ---------------------------------------------------------------------------
# Narration script — matched 1-to-1 with narrate() calls in demo-v2.spec.js
# ---------------------------------------------------------------------------
VOICEOVER = [
    ("INTRO.welcome",
     "Welcome to SkyrakSys H-R-M — a complete Human Resource Management System "
     "built to streamline every aspect of your workforce. In this demo, we'll walk "
     "through every feature across four personas: Administrator, H-R, Manager, and Employee."),

    ("ADMIN.dashboard",
     "Logged in as the Administrator. The Admin Dashboard gives an instant overview — "
     "total headcount, employees on leave, new hires this month, and pending approvals — "
     "all at a glance."),

    ("ADMIN.employees.list",
     "The Employee Directory lists your entire workforce with powerful search, "
     "department filters, and status filters. Find any employee in seconds."),

    ("ADMIN.employees.cards",
     "Switch to Card View for a visual, photo-first layout — great for "
     "identifying team members quickly at a glance."),

    ("ADMIN.employees.profile",
     "Every employee has a rich profile with tabbed sections: Personal Information, "
     "Employment Details, Emergency Contacts, and Statutory and Banking information."),

    ("ADMIN.employees.addForm",
     "The Add Employee form organises onboarding across three clear tabs — "
     "Personal Information, Employment and Compensation, and Statutory, Banking "
     "and Access settings — with real-time validation on every field."),

    ("ADMIN.employees.payslip",
     "Every employee profile has a direct Payslip button. Clicking it opens "
     "the fully formatted payslip — company header, earnings breakdown, "
     "deductions, and net pay in one clean view. Download as PDF or print "
     "directly from here."),

    ("ADMIN.employee.records",
     "Employee Records gives a consolidated audit trail — leave history, "
     "timesheet submissions, and monthly attendance summaries — all "
     "searchable for any employee from a single screen."),

    ("ADMIN.leave.management",
     "Leave Management gives the admin a complete view of all leave requests — "
     "filterable by status, type, or department."),

    ("ADMIN.leave.approve",
     "Approving a leave request is a single click. The requester "
     "is notified automatically."),

    ("ADMIN.attendance.management",
     "The Attendance Management screen lets administrators view, correct, "
     "and mark attendance for any employee on any date."),

    ("ADMIN.timesheet.approvals",
     "All submitted timesheets appear here for review. Filter by project, "
     "employee, or date range."),

    ("ADMIN.payroll.management",
     "Payroll Management covers salary processing from generation to finalisation. "
     "One click generates payslips for the selected month."),

    ("ADMIN.payroll.generate",
     "The generation wizard validates timesheet data before creating payslips — "
     "preventing errors before they reach payroll."),

    ("ADMIN.payroll.templates",
     "Payslip Templates let you design the exact layout and earning or deduction "
     "components that appear on employee payslips."),

    ("ADMIN.org.settings",
     "Organization Settings manages your company's structural foundation — "
     "Departments, Positions, and the Holiday Calendar."),

    ("ADMIN.user.management",
     "User Management controls access — create accounts, assign roles, "
     "lock users, or force logout directly from here."),

    ("ADMIN.reports",
     "The Reports module delivers four high-value report types: Attendance Summary, "
     "Leave Analysis, Payroll Summary, and a complete Employee Report — all exportable."),

    ("ADMIN.settings",
     "System Settings covers email configuration, security policies, "
     "backup and restore, and application branding."),

    ("ADMIN.user.guide",
     "The built-in User Guide documents every module with step-by-step instructions — "
     "reducing onboarding time for new users."),

    ("HR.dashboard",
     "The H-R portal focuses on people operations. The dashboard surfaces "
     "leave and headcount metrics relevant to H-R workflows."),

    ("HR.leave.balances",
     "Leave Balance Management shows every employee's accrued, taken, and remaining "
     "leave — searchable and filterable by type or year."),

    ("HR.leave.accrual",
     "The Accrual engine calculates and previews how leave days accumulate "
     "before committing — giving H-R full control and transparency."),

    ("HR.leave.types",
     "Leave types are fully configurable — define names, maximum days, "
     "accrual rules, and carry-forward policies for your company."),

    ("HR.reviews",
     "Performance Reviews are managed from a single interface — create, "
     "track, and close review cycles across the organisation."),

    ("MANAGER.dashboard",
     "The Manager Dashboard focuses on team health — pending approvals, "
     "upcoming leaves, and submitted timesheets from direct reports."),

    ("MANAGER.team",
     "The Team Members tab shows each direct report with their current "
     "status, role, and leave balance summary."),

    ("MANAGER.leave.approval",
     "Alice Brown has requested annual leave for next week. Managers can "
     "review the reason and approve or reject with a single action."),

    ("MANAGER.timesheet.approval",
     "Alice's weekly timesheet is submitted and waiting for approval. "
     "The manager reviews hours per day and project breakdown before approving."),

    ("EMPLOYEE.dashboard",
     "From the employee's perspective, the dashboard shows quick stats — "
     "pending leaves, this month's attendance, leave balance, and shortcuts "
     "to common actions."),

    ("EMPLOYEE.attendance",
     "My Attendance shows today's check-in status and the full monthly calendar "
     "with colour-coded statuses — present, late, half-day, absent, and holidays."),

    ("EMPLOYEE.leave.submit",
     "Submitting a leave request takes seconds — pick the type, choose dates, "
     "add a reason, and submit. The balance is shown live."),

    ("EMPLOYEE.timesheet",
     "The weekly timesheet grid lets employees log hours per task and project "
     "for each day — save as draft and submit when ready."),

    ("EMPLOYEE.payslips",
     "My Payslips shows a complete history of payslips. Click View to open "
     "a fully formatted payslip with all earnings and deductions detailed."),

    ("EMPLOYEE.payslips.dialog",
     "The formatted payslip opens in a full-screen viewer — company branding at "
     "the top, employee details, then a clear earnings and deductions table. "
     "Net pay is shown prominently at the bottom. "
     "Download as a P-D-F or print directly from the same screen."),

    ("EMPLOYEE.tasks",
     "My Tasks lists all tasks assigned to the employee with priority indicators, "
     "status, and project context."),

    ("EMPLOYEE.profile",
     "My Profile is fully self-editable — update personal info, emergency contacts, "
     "and bank details with full audit logging."),

    ("EMPLOYEE.performance",
     "The Performance Dashboard gives real-time insight into application health — "
     "page-load times, A-P-I response metrics, and client-side performance indicators — "
     "so bottlenecks are caught before they impact the workforce."),

    ("CLOSING",
     "SkyrakSys H-R-M — purpose-built for growing organisations. "
     "Every workflow, every persona, covered end to end. "
     "Thank you for watching."),
]

# ---------------------------------------------------------------------------
# Output directory
# ---------------------------------------------------------------------------
OUT_DIR = Path(__file__).resolve().parent.parent / "demo-output" / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)

FORCE = "--force" in sys.argv


async def generate_clip_async(label, text, out_path, retries=3):
    """Generate a single MP3 clip using edge-tts with retry logic."""
    import edge_tts
    for attempt in range(1, retries + 1):
        try:
            communicate = edge_tts.Communicate(text=text, voice=VOICE)
            await asyncio.wait_for(communicate.save(str(out_path)), timeout=30)
            if out_path.exists() and out_path.stat().st_size > 0:
                return True
            # 0-byte file — delete and retry
            out_path.unlink(missing_ok=True)
        except asyncio.TimeoutError:
            print(f"\n  ⚠ Attempt {attempt} timed out for {label}")
            out_path.unlink(missing_ok=True)
        except Exception as e:
            print(f"\n  ⚠ Attempt {attempt} failed — {e}")
            out_path.unlink(missing_ok=True)
        if attempt < retries:
            await asyncio.sleep(1.5 * attempt)  # back-off before retry
    return False


async def generate_clips_async():
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        print("ERROR: edge-tts not installed. Run: pip install edge-tts")
        sys.exit(1)

    manifest = []
    total = len(VOICEOVER)

    print(f"\n🎙  Generating {total} TTS clips  [voice: {VOICE}]\n")

    for i, (label, text) in enumerate(VOICEOVER, 1):
        safe_name = label.replace(".", "_")
        out_path = OUT_DIR / f"{safe_name}.mp3"

        if out_path.exists() and not FORCE:
            size = out_path.stat().st_size
            print(f"  [{i:02d}/{total}]  ✅ EXISTS  {label}  ({size:,} bytes)")
        else:
            flag = "RE-GEN" if out_path.exists() else "GENERATE"
            print(f"  [{i:02d}/{total}]  🔊 {flag}  {label}... ", end="", flush=True)
            ok = await generate_clip_async(label, text, out_path)
            if ok and out_path.exists():
                print(f"done  ({out_path.stat().st_size:,} bytes)")
            else:
                out_path = None

        manifest.append({
            "label": label,
            "text": text,
            "file": str(out_path) if out_path and out_path.exists() else None,
        })
        await asyncio.sleep(0.4)  # avoid rate-limiting

    # Save manifest
    manifest_path = OUT_DIR / "clips-manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    ok_count = sum(1 for m in manifest if m["file"])
    print(f"\n✅  {ok_count}/{total} clips ready  [voice: {VOICE}]")
    print(f"   Manifest: {manifest_path}\n")
    return manifest


if __name__ == "__main__":
    asyncio.run(generate_clips_async())
