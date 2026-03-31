"""
SkyrakSys HRM — Mobile Demo Voiceover Generator
=================================================
Generates individual MP3 clips for every narration cue in the mobile demo.
Uses Microsoft Edge TTS neural voice (en-US-ChristopherNeural).

Usage:
    python scripts/generate-mobile-voiceover.py [--force]

Options:
    --force   Re-generate all clips even if they already exist

Output:
    demo-output-mobile/audio/<cue-label>.mp3   — one file per narration cue
    demo-output-mobile/audio/clips-manifest.json

Requirements:
    pip install edge-tts

Narration cues (19 total, matching narrate() calls in mobile-demo-flows.spec.js):
  INTRO.welcome
  EMPLOYEE.login, .dashboard, .checkin, .attendance, .leave,
  .apply_leave, .timesheet, .payslips, .tasks, .checkout, .profile
  MANAGER.intro, .dashboard, .approve_leave, .leave_approvals,
  .team_attendance, .timesheet_approvals, .profile, .logout
"""

import sys
import json
import asyncio
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("ERROR: edge-tts not installed. Run:  pip install edge-tts")
    sys.exit(1)

VOICE      = "en-US-ChristopherNeural"   # professional US male neural voice
AUDIO_DIR  = Path(__file__).resolve().parent.parent / "demo-output-mobile" / "audio"
FORCE      = "--force" in sys.argv

# ---------------------------------------------------------------------------
# Narration script — matched 1:1 with narrate() calls in the spec
# Tuned at ~2.5 words/sec to fill each scene comfortably.
# ---------------------------------------------------------------------------
VOICEOVER = [
    # ── INTRO — plays over the title card ──────────────────────────────────
    ("INTRO.welcome",
     "Welcome to SkyrakSys H-R-M — a complete Human Resource Management platform "
     "built for modern teams. In this demo, we'll walk through the mobile app "
     "experience from two perspectives: first as an employee, then as a manager. "
     "Let's get started."),

    # ── EMPLOYEE FLOW ──────────────────────────────────────────────────────
    ("EMPLOYEE.login",
     "Alice Brown logs in as an employee. After authentication, she lands directly "
     "on her personalised dashboard. The home screen shows today's attendance status "
     "with a Check In button, her total leave balance of 228 days across all leave "
     "types, and her weekly hours."),

    ("EMPLOYEE.dashboard",
     "The dashboard is Alice's command centre for the day. Her leave breakdown shows "
     "12 sick days fully available, 9 casual days remaining, and 10 of 21 annual days "
     "still to use. Quick action buttons at the bottom give one-tap access to leave, "
     "timesheets, payslips, and tasks."),

    ("EMPLOYEE.checkin",
     "Alice taps Check In to mark her attendance. The system records her arrival at "
     "9:24 in the morning. The button immediately switches to orange, confirming the "
     "check-in is done and showing she can check out later."),

    ("EMPLOYEE.attendance",
     "The Attendance tab shows a full calendar for March 2026. Green dots mark days "
     "she was present on time. Orange dots — including today, the 31st — indicate a "
     "late arrival. A blue dot on the 23rd marks a half-day. The complete month is "
     "visible at a glance."),

    ("EMPLOYEE.leave",
     "On the Leave tab, Alice can see all her balances at once. Sick leave is fully "
     "intact at 12 days. Casual shows 9 of 12 remaining with 3 days pending approval. "
     "Annual leave has 10 days left — 15 have already been used. Below the balance "
     "cards, her leave history shows a rejected request, a pending 5-day April "
     "vacation, and an approved day in March."),

    ("EMPLOYEE.apply_leave",
     "Tapping the plus button opens the new leave request form. Alice selects Annual "
     "Leave, the dates are set to today, and she enters her reason — annual vacation, "
     "a family trip planned for next month. She taps Submit Request to send it "
     "directly to her manager's approval queue."),

    ("EMPLOYEE.timesheet",
     "The Timesheet tab shows the current week — Monday the 30th of March. Alice has "
     "logged 38 hours in total on the HRM System project. 8 hours each from Monday "
     "through Thursday, and 6 hours on Friday. The week has already been submitted "
     "and is awaiting her manager's approval."),

    ("EMPLOYEE.payslips",
     "The Payslips tab lists Alice's recent salary statements. Both January and "
     "February 2026 show gross earnings of 96,000 rupees with deductions of 17,600 "
     "rupees, giving a net pay of 78,400 rupees. Tapping February opens the full "
     "breakdown — basic salary, house rent allowance, special allowance, provident "
     "fund, income tax, and professional tax."),

    ("EMPLOYEE.tasks",
     "The Tasks tab shows Alice's 4 open work items across two projects. Backend "
     "Development is already in progress — high priority with 120 hours estimated. "
     "API Integration, Q-A Testing, and Documentation are not yet started, ranging "
     "from medium to low priority."),

    ("EMPLOYEE.checkout",
     "Back on the dashboard, Alice taps Check Out to close her attendance for the "
     "day. The system records her departure at 9:27 in the morning and the display "
     "now shows the full entry — in at 9:24, out at 9:27. The button changes to "
     "Done, confirming the record is saved."),

    ("EMPLOYEE.profile",
     "Alice's profile shows her complete details — Employee ID E-M-P-0004, Software "
     "Engineer in the Engineering department, joined March 2024. She has the option "
     "to enable biometric login for faster access. The logout button sits at the "
     "bottom of the page."),

    # ── MANAGER FLOW ──────────────────────────────────────────────────────
    ("MANAGER.intro",
     "Now switching to the Manager perspective. John Smith, Team Lead, logs in with "
     "his manager account to oversee his team's activity, review leave requests, "
     "and approve timesheets."),

    ("MANAGER.dashboard",
     "John's manager dashboard shows a live team snapshot. Team size is 2, with 1 "
     "member present today and 1 on leave. There are 2 pending leave requests and "
     "2 timesheets waiting for approval. Both leave requests appear inline on the "
     "dashboard — Alice's 5-day annual leave and Bob's 2-day casual leave for April "
     "— each with approve and reject buttons right there."),

    ("MANAGER.approve_leave",
     "John reviews Alice Brown's annual leave request for April 7th to 11th — a "
     "5-day family vacation planned in advance. He taps the green approve button. "
     "A success toast confirms the approval instantly, and the pending leave count "
     "drops from 2 down to 1."),

    ("MANAGER.leave_approvals",
     "The Leave tab's Approvals section now shows Bob Wilson's remaining request — "
     "2 days of casual leave on April 3rd and 4th for a family function. John can "
     "approve or reject it directly from this dedicated approvals tab."),

    ("MANAGER.team_attendance",
     "The Team Today tab in Attendance gives managers a real-time view of who is "
     "present, absent, or on leave for the current day. As team members check in "
     "throughout the morning, their status updates here automatically."),

    ("MANAGER.timesheet_approvals",
     "In the Timesheet Approvals tab, John sees both submissions for the week of "
     "March 30th. Alice logged 38 hours on the HRM System project. Bob logged "
     "39 hours on the same project. John can approve each one individually or "
     "tap Approve All to clear both at once."),

    ("MANAGER.profile",
     "John's profile confirms his role — Team Lead in the Engineering department, "
     "Employee ID E-M-P-0003, joined February 2024. The Manager View toggle is "
     "switched on, which is what enables the team dashboard, approval queues, and "
     "all management features throughout the app."),

    ("MANAGER.logout",
     "That wraps up the SkyrakSys H-R-M mobile demo. From employee self-service — "
     "attendance, leave, timesheets, payslips and tasks — to manager oversight and "
     "approvals, the platform covers the complete H-R workflow on mobile. Thank you "
     "for watching."),
]

# ---------------------------------------------------------------------------

async def generate_clip(label: str, text: str) -> dict:
    """Generate one MP3 clip and return its manifest entry."""
    filename = f"{label.replace('.', '_')}.mp3"
    out_path = AUDIO_DIR / filename
    if out_path.exists() and not FORCE:
        print(f"  ✓ (exists) {filename}")
        return {"label": label, "file": filename, "text": text[:60] + "..."}

    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(str(out_path))
    print(f"  ✓ Generated {filename}")
    return {"label": label, "file": filename, "text": text[:60] + "..."}


async def main():
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n🎙  Mobile Demo Voiceover Generator")
    print(f"   Voice  : {VOICE}")
    print(f"   Output : {AUDIO_DIR}")
    print(f"   Clips  : {len(VOICEOVER)}")
    print(f"   Force  : {FORCE}\n")

    manifest = []
    for label, text in VOICEOVER:
        entry = await generate_clip(label, text)
        manifest.append(entry)

    manifest_path = AUDIO_DIR / "clips-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"\n✅  Done! {len(manifest)} clips → {manifest_path}")
    print(f"\nNext steps:")
    print(f"  1. Run the Playwright demo:  cd frontend && npx playwright test -c playwright-mobile-demo.config.js --headed")
    print(f"  2. Merge audio + video:      python scripts/merge-mobile-demo.py")


asyncio.run(main())
