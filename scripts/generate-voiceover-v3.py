"""
SkyrakSys HRM Demo — Voiceover Audio Generator v3
===================================================
Generates individual MP3 clips for every narration cue using Microsoft
Edge TTS neural voices (en-US-ChristopherNeural — professional male).

Usage:
    python scripts/generate-voiceover-v3.py [--force]

Options:
    --force   Re-generate all clips even if they already exist

Output:
    demo-output-v3/audio/<cue-label>.mp3   — one file per narration cue
    demo-output-v3/audio/clips-manifest.json

Requirements:
    pip install edge-tts

CHANGES vs v1:
    - Output directory: demo-output-v3/audio/
    - Narration cue list matches demo-v3.spec.js markers exactly
    - EMPLOYEE.payslips.dialog added as a new cue
"""

import sys
import json
import asyncio
from pathlib import Path

VOICE = "en-US-ChristopherNeural"   # professional US male neural voice

# ---------------------------------------------------------------------------
# Narration script — matched 1-to-1 with narrate() calls in demo-v3.spec.js
# Order MUST match the 44 cue markers in video-markers-v3.json exactly.
# Each narration is sized to fit its cue window (time to the next cue).
# ---------------------------------------------------------------------------
VOICEOVER = [
    # ═══════════════════════════════════════════════════════════════════════
    # Target: speech fills ~85 % of each window.  ~2.6 words / sec.
    # ═══════════════════════════════════════════════════════════════════════

    # ── INTRO  window 14.5 s  → target ≈ 34 words ────────────────────────
    ("INTRO.welcome",
     "Welcome to SkyrakSys H-R-M — a complete Human Resource Management "
     "platform built for growing organisations. In this demo we will walk "
     "through every feature across four personas: Administrator, H-R, "
     "Manager, and Employee. Let's get started."),

    # ── ADMIN ────────────────────────────────────────────────────────────
    # window 13.2 s  → ~30 words
    ("ADMIN.dashboard",
     "Signed in as the Administrator. The dashboard gives an instant "
     "overview — total headcount, employees on leave today, new hires "
     "this month, and pending approvals — all at a glance."),

    # window 26.7 s  → ~62 words
    ("ADMIN.employees.list",
     "The Employee Directory lists your entire workforce with real-time "
     "search, department filters, and status indicators. Administrators "
     "can sort by name, role, or joining date to locate anyone instantly. "
     "Colour-coded badges show active, on-leave, or inactive status at a "
     "glance. The directory also supports bulk actions and direct "
     "navigation to any employee's full profile — making it the central "
     "hub for people management."),

    # window 6.7 s  → ~16 words
    ("ADMIN.employees.cards",
     "Switch to Card View for a visual, photo-first layout — ideal for "
     "quickly identifying team members."),

    # window 13.1 s  → ~30 words
    ("ADMIN.employees.addForm",
     "Adding a new employee is structured across three clear tabs — "
     "Personal Information, Employment and Compensation, and Statutory "
     "and Access settings — with real-time validation on every field."),

    # window 7.7 s  → ~18 words
    ("ADMIN.employees.profile",
     "Each employee has a rich profile — Personal Details, Employment, "
     "Emergency Contacts, and Banking information, all in tabbed sections."),

    # window 20.6 s  → ~48 words
    ("ADMIN.employees.payslip",
     "The Payslip button on every profile opens a fully formatted payslip — "
     "company header, earnings breakdown, deductions, and net pay in one "
     "clean view. Every component is itemised so that both the employee and "
     "H-R can verify amounts at a glance. Download as P-D-F or print "
     "directly from here."),

    # window 16.6 s  → ~38 words
    ("ADMIN.employee.records",
     "Employee Records provides a consolidated audit trail — leave history, "
     "timesheet submissions, and monthly attendance summaries — all "
     "searchable for any employee from a single screen. Filter by date "
     "range or record type to drill into exactly the data you need."),

    # window 5.0 s  → ~12 words
    ("ADMIN.leave.management",
     "Leave Management gives a complete view of all leave requests across "
     "the organisation."),

    # window 8.1 s  → ~19 words
    ("ADMIN.leave.approve",
     "Approving or rejecting a leave request is a single click. "
     "The employee is notified automatically and balances update in "
     "real time."),

    # window 7.7 s  → ~18 words
    ("ADMIN.attendance.management",
     "Attendance Management lets administrators view, correct, and mark "
     "attendance for any employee on any date."),

    # window 8.6 s  → ~20 words
    ("ADMIN.timesheet.approvals",
     "Submitted timesheets appear here for review — filterable by project, "
     "employee, or date range. Approve or return them with one click."),

    # window 6.8 s  → ~16 words
    ("ADMIN.payroll.management",
     "Payroll Management handles salary processing from generation "
     "to finalisation — all in one place."),

    # window 16.6 s  → ~38 words
    ("ADMIN.payroll.generate",
     "The generation wizard validates timesheet data and attendance "
     "records before creating payslips — preventing errors before they "
     "reach payroll. Select the pay period, confirm the employee list, "
     "and one click processes the entire month including tax calculations "
     "and deductions."),

    # window 8.3 s  → ~19 words
    ("ADMIN.payroll.templates",
     "Payslip Templates let you design the exact layout and earning or "
     "deduction components for your organisation."),

    # window 13.0 s  → ~30 words
    ("ADMIN.org.settings",
     "Organisation Settings manages your company's structural foundation — "
     "Departments, Positions, and the Holiday Calendar — all configurable "
     "from one screen. Changes propagate automatically across payroll, "
     "attendance, and leave modules."),

    # window 8.7 s  → ~20 words
    ("ADMIN.user.management",
     "User Management controls access — create accounts, assign roles, "
     "lock users, or force logout. Audit logs track every change."),

    # window 12.1 s  → ~28 words
    ("ADMIN.reports",
     "The Reports module delivers four report types: Attendance Summary, "
     "Leave Analysis, Payroll Summary, and Employee Report. Each can be "
     "filtered by department or date range and exported instantly."),

    # window 4.5 s  → ~10 words
    ("ADMIN.settings",
     "System Settings covers e-mail, security, and application branding."),

    # window 7.9 s  → ~18 words
    ("ADMIN.restore",
     "Restore Records lets administrators recover soft-deleted data — "
     "reviews, leave balances, and other records — with a single click."),

    # window 8.1 s  → ~19 words
    ("ADMIN.projects",
     "The Projects module tracks all active projects with task breakdowns, "
     "team assignments, and real-time progress indicators."),

    # window 11.1 s  → ~25 words
    ("ADMIN.user.guide",
     "The built-in User Guide documents every module with step-by-step "
     "instructions and contextual tips — significantly reducing onboarding "
     "time for new administrators and support staff."),

    # ── HR ───────────────────────────────────────────────────────────────
    # window 27.2 s  → ~64 words
    ("HR.dashboard",
     "Now switching to the H-R persona. The H-R dashboard is purpose-built "
     "for people operations — surfacing leave metrics, headcount trends, "
     "and compliance indicators relevant to daily workflows. At a glance, "
     "H-R can see how many employees are on leave today, upcoming leave "
     "requests awaiting action, and a department-wise headcount breakdown. "
     "This single view eliminates the need to hop between multiple screens "
     "to stay on top of workforce health."),

    # window 8.6 s  → ~20 words
    ("HR.leave.balances",
     "Leave Balance Management shows every employee's accrued, taken, "
     "and remaining days — filterable by leave type or calendar year."),

    # window 6.9 s  → ~16 words
    ("HR.leave.accrual",
     "The Accrual engine previews how leave days accumulate before "
     "committing — giving H-R full control."),

    # window 9.0 s  → ~21 words
    ("HR.leave.types",
     "Leave types are fully configurable — define names, maximum days, "
     "accrual rules, carry-forward policies, and applicable departments "
     "for each type."),

    # window 12.0 s  → ~28 words
    ("HR.reviews",
     "Performance Reviews are managed from one interface — H-R can "
     "create review cycles, assign reviewers, set deadlines, and track "
     "completion status across teams and the entire organisation."),

    # ── MANAGER ──────────────────────────────────────────────────────────
    # window 6.0 s  → ~14 words
    ("MANAGER.dashboard",
     "The Manager Dashboard focuses on team health — pending approvals "
     "and upcoming leaves at a glance."),

    # window 5.2 s  → ~12 words
    ("MANAGER.team",
     "Team Members shows each direct report with their role and "
     "current status."),

    # window 12.4 s  → ~29 words
    ("MANAGER.leave.approval",
     "A team member has requested annual leave. The manager reviews the "
     "reason, checks team coverage for the requested dates, and approves "
     "or rejects with a single action — keeping the team balanced."),

    # window 5.4 s  → ~12 words
    ("MANAGER.timesheet.approval",
     "Submitted timesheets are reviewed for hours and project breakdown "
     "before approval."),

    # window 6.1 s  → ~14 words
    ("MANAGER.reviews",
     "Managers can create and submit performance reviews for each "
     "direct report from here."),

    # window 13.0 s  → ~30 words
    ("MANAGER.projects",
     "The Manager's project view shows assigned projects with tasks, "
     "deadlines, and team-member allocations. Progress bars and status "
     "indicators help the manager spot blockers early and keep delivery "
     "on track."),

    # ── EMPLOYEE ─────────────────────────────────────────────────────────
    # window 10.9 s  → ~25 words
    ("EMPLOYEE.dashboard",
     "From the employee's perspective, the dashboard shows quick stats — "
     "pending leaves, this month's attendance percentage, leave balances, "
     "and shortcuts to commonly used actions."),

    # window 8.4 s  → ~20 words
    ("EMPLOYEE.attendance",
     "My Attendance shows today's check-in and the monthly calendar "
     "with colour-coded statuses — present, late, absent, and holidays."),

    # window 19.3 s  → ~45 words
    ("EMPLOYEE.leave.submit",
     "Submitting a leave request takes seconds. Pick the leave type, "
     "choose the start and end dates, and add a reason. The remaining "
     "balance updates live as dates are selected, so there are no "
     "surprises. Once submitted, the request flows to the manager's "
     "approval queue automatically."),

    # window 8.2 s  → ~19 words
    ("EMPLOYEE.timesheet",
     "The weekly timesheet grid lets employees log hours per task and "
     "project — save as draft and submit when ready."),

    # window 8.7 s  → ~20 words
    ("EMPLOYEE.payslips",
     "My Payslips shows a complete month-by-month history. Click any "
     "entry to open the full earnings and deductions breakdown."),

    # window 25.0 s  → ~58 words
    ("EMPLOYEE.payslips.dialog",
     "The payslip viewer displays company branding at the top, followed "
     "by the employee's details and pay period. Below that is a clear "
     "earnings and deductions table — basic salary, allowances, overtime, "
     "provident fund, and tax components are all itemised. The net pay "
     "is highlighted prominently at the bottom. From the same screen, "
     "employees can download the payslip as a P-D-F or send it "
     "directly to print."),

    # window 9.1 s  → ~21 words
    ("EMPLOYEE.tasks",
     "My Tasks lists all assignments with priority, status, and project "
     "context — keeping the employee focused on what matters most."),

    # window 6.2 s  → ~14 words
    ("EMPLOYEE.reviews",
     "Employees can view their performance reviews and submit "
     "self-assessments directly from here."),

    # window 7.2 s  → ~17 words
    ("EMPLOYEE.profile",
     "My Profile is self-editable — update personal info, emergency "
     "contacts, and bank details at any time."),

    # window 13.4 s  → ~31 words
    ("EMPLOYEE.performance",
     "The Performance Dashboard tracks application health in real time — "
     "page-load times, A-P-I response metrics, and client-side "
     "indicators are all graphed live, helping the team catch and "
     "resolve bottlenecks before they affect users."),

    # ── CLOSING  (last cue — no window limit) ────────────────────────────
    ("CLOSING",
     "SkyrakSys H-R-M — purpose-built for growing organisations. "
     "Every workflow, every persona, covered end to end. "
     "Thank you for watching."),
]

# ---------------------------------------------------------------------------
# Output directory — v3
# ---------------------------------------------------------------------------
OUT_DIR = Path(__file__).resolve().parent.parent / "demo-output-v3" / "audio"
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
            out_path.unlink(missing_ok=True)
        except asyncio.TimeoutError:
            print(f"\n  ⚠ Attempt {attempt} timed out for {label}")
            out_path.unlink(missing_ok=True)
        except Exception as e:
            print(f"\n  ⚠ Attempt {attempt} failed — {e}")
            out_path.unlink(missing_ok=True)
        if attempt < retries:
            await asyncio.sleep(1.5 * attempt)
    return False


async def generate_clips_async():
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        print("ERROR: edge-tts not installed. Run: pip install edge-tts")
        sys.exit(1)

    manifest = []
    total = len(VOICEOVER)

    print(f"\n🎙  Generating {total} TTS clips  [voice: {VOICE}]")
    print(f"    Output dir: {OUT_DIR}\n")

    for i, (label, text) in enumerate(VOICEOVER, 1):
        safe_name = label.replace(".", "_")
        out_path = OUT_DIR / f"{safe_name}.mp3"

        min_valid_bytes = 5000  # anything under 5 KB is likely corrupt/truncated
        if out_path.exists() and not FORCE and out_path.stat().st_size >= min_valid_bytes:
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
        await asyncio.sleep(0.4)

    manifest_path = OUT_DIR / "clips-manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    ok_count = sum(1 for m in manifest if m["file"])
    print(f"\n✅  {ok_count}/{total} clips ready  [voice: {VOICE}]")
    print(f"   Manifest: {manifest_path}\n")
    return manifest


if __name__ == "__main__":
    asyncio.run(generate_clips_async())
