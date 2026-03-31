"""Generate remaining missing voiceover clips via edge-tts CLI (subprocess)."""
import subprocess
import time
from pathlib import Path

VOICE = "en-US-ChristopherNeural"
OUT = Path(r"d:\skyraksys_hrm1\skyraksys_hrm_app\demo-output\audio")

CLIPS = [
    ("HR_leave_balances",
     "Leave Balance Management shows every employee's accrued, taken, and remaining "
     "leave, searchable and filterable by type or year."),
    ("HR_leave_accrual",
     "The Accrual engine calculates and previews how leave days accumulate "
     "before committing, giving H-R full control and transparency."),
    ("HR_leave_types",
     "Leave types are fully configurable. Define names, maximum days, "
     "accrual rules, and carry-forward policies for your company."),
    ("HR_reviews",
     "Performance Reviews are managed from a single interface. "
     "Create, track, and close review cycles across the organisation."),
    ("MANAGER_dashboard",
     "The Manager Dashboard focuses on team health. Pending approvals, "
     "upcoming leaves, and submitted timesheets from direct reports."),
    ("MANAGER_team",
     "The Team Members tab shows each direct report with their current "
     "status, role, and leave balance summary."),
    ("MANAGER_leave_approval",
     "Alice Brown has requested annual leave for next week. Managers can "
     "review the reason and approve or reject with a single action."),
    ("MANAGER_timesheet_approval",
     "Alice's weekly timesheet is submitted and waiting for approval. "
     "The manager reviews hours per day and project breakdown before approving."),
    ("EMPLOYEE_dashboard",
     "From the employee's perspective, the dashboard shows quick stats. "
     "Pending leaves, this month's attendance, leave balance, and shortcuts "
     "to common actions."),
    ("EMPLOYEE_attendance",
     "My Attendance shows today's check-in status and the full monthly calendar "
     "with colour-coded statuses. Present, late, half-day, absent, and holidays."),
    ("EMPLOYEE_leave_submit",
     "Submitting a leave request takes seconds. Pick the type, choose dates, "
     "add a reason, and submit. The balance is shown live."),
    ("EMPLOYEE_timesheet",
     "The weekly timesheet grid lets employees log hours per task and project "
     "for each day. Save as draft and submit when ready."),
    ("EMPLOYEE_payslips",
     "My Payslips shows a complete history of payslips. Click View to open "
     "a fully formatted payslip with all earnings and deductions detailed."),
    ("EMPLOYEE_payslips_dialog",
     "The formatted payslip opens in a full-screen viewer. Company branding at "
     "the top, employee details, then a clear earnings and deductions table. "
     "Net pay is shown prominently at the bottom. "
     "Download as a P-D-F or print directly from the same screen."),
    ("EMPLOYEE_tasks",
     "My Tasks lists all tasks assigned to the employee with priority indicators, "
     "status, and project context."),
    ("EMPLOYEE_profile",
     "My Profile is fully self-editable. Update personal info, emergency contacts, "
     "and bank details with full audit logging."),
    ("EMPLOYEE_performance",
     "The Performance Dashboard gives real-time insight into application health. "
     "Page-load times, A-P-I response metrics, and client-side performance indicators, "
     "so bottlenecks are caught before they impact the workforce."),
    ("CLOSING",
     "SkyrakSys H-R-M, purpose-built for growing organisations. "
     "Every workflow, every persona, covered end to end. "
     "Thank you for watching."),
]

total = len(CLIPS)
print(f"\nGenerating {total} remaining clips  [voice: {VOICE}]\n")

for i, (name, text) in enumerate(CLIPS, 1):
    out = OUT / f"{name}.mp3"
    if out.exists() and out.stat().st_size > 0:
        print(f"  [{i:02d}/{total}]  EXISTS  {name}  ({out.stat().st_size:,}b)")
        continue
    print(f"  [{i:02d}/{total}]  Generating  {name}... ", end="", flush=True)
    success = False
    for attempt in range(1, 4):
        try:
            r = subprocess.run(
                ["edge-tts", "--voice", VOICE, "--text", text, "--write-media", str(out)],
                capture_output=True, text=True, timeout=35,
            )
            if r.returncode == 0 and out.exists() and out.stat().st_size > 0:
                print(f"done  ({out.stat().st_size:,}b)")
                success = True
                break
        except Exception as e:
            print(f"[err: {type(e).__name__}] ", end="", flush=True)
        out.unlink(missing_ok=True)
        if attempt < 3:
            print(f"retry{attempt}... ", end="", flush=True)
            time.sleep(2 * attempt)
    if not success:
        print("FAILED")
    time.sleep(0.8)

ok = sum(1 for name, _ in CLIPS if (OUT / f"{name}.mp3").exists() and (OUT / f"{name}.mp3").stat().st_size > 0)
print(f"\nDone: {ok}/{total} clips generated\n")
