"""
SkyrakSys HRM — Demo Voiceover Generator (v2)
===============================================
1. Generates individual MP3 narration clips via Microsoft Edge TTS.
2. Measures each clip's duration and saves  clip-timings.json
   so the Playwright recording script can sync its pauses.
3. Combines audio with the recorded video using timestamp-based
   placement (reads video-markers.json written by Playwright).

Usage:
  # Step 1 – generate audio (run BEFORE recording)
  python scripts/generate-demo-voiceover.py

  # Step 2 – record the demo in Playwright (uses clip-timings.json)
  cd frontend && npx playwright test -c playwright-demo.config.js demo-walkthrough

  # Step 3 – combine video + audio
  python scripts/generate-demo-voiceover.py --combine --video path/to/video.webm

Requires: pip install edge-tts imageio-ffmpeg
"""

import asyncio, json, os, re, subprocess, sys, argparse

try:
    import edge_tts
except ImportError:
    print("Install edge-tts first:  pip install edge-tts"); sys.exit(1)

# ── Configuration ────────────────────────────────────────────
VOICE      = "en-US-GuyNeural"
RATE       = "-5%"
ROOT       = os.path.join(os.path.dirname(__file__), "..")
OUTPUT_DIR = os.path.join(ROOT, "demo-output", "audio")

# ── Narration Script ─────────────────────────────────────────
NARRATION = [
    # ── Intro & Login ────────────────────────────────────────
    {
        "id": "INTRO",
        "text": (
            "Welcome to SkyrakSys H-R-M, a comprehensive Human Resource Management system. "
            "In this demo, we'll walk through every major feature of the application, "
            "showcasing the experience for Administrators, Managers, H-R, and Employees."
        ),
    },
    {
        "id": "SCENE_01_LOGIN",
        "text": (
            "This is the login page. The system supports secure authentication "
            "with role-based access control. Let's log in as an Administrator."
        ),
    },
    {
        "id": "SCENE_01_ADMIN_LOGIN",
        "text": (
            "After logging in, the Administrator is greeted with a rich dashboard."
        ),
    },
    {
        "id": "SCENE_01_DASHBOARD",
        "text": (
            "The dashboard shows key metrics: total employees, pending leave requests, "
            "pending timesheets, and payroll status. Each metric card is clickable "
            "for quick navigation."
        ),
    },
    {
        "id": "SCENE_01_DASHBOARD_SCROLL",
        "text": (
            "Scrolling down reveals additional analytics such as department-wise "
            "employee distribution, recent activities, and quick action buttons."
        ),
    },
    # ── Employee Management ──────────────────────────────────
    {
        "id": "SCENE_02_EMPLOYEES",
        "text": (
            "The Employee Management module provides a comprehensive list of all employees. "
            "Admins can add new employees, export the list, and filter by department or status."
        ),
    },
    {
        "id": "SCENE_02_SEARCH",
        "text": (
            "The search bar filters employees instantly by name, I-D, or email as you type."
        ),
    },
    {
        "id": "SCENE_02_PROFILE",
        "text": (
            "Clicking the view icon opens the employee's full profile page."
        ),
    },
    {
        "id": "SCENE_02_PROFILE_SECTIONS",
        "text": (
            "The profile is organized into scrollable card sections: Personal Information "
            "at the top, followed by Employment Details, Salary and Compensation, "
            "and Statutory Information at the bottom. "
            "Each section is clearly separated for easy reading."
        ),
    },
    {
        "id": "SCENE_02_ADD_EMPLOYEE",
        "text": (
            "The Add Employee form provides structured fields with real-time validation "
            "for email, phone numbers, and P-A-N. Let's scroll through the form fields."
        ),
    },
    # ── Leave Management ─────────────────────────────────────
    {
        "id": "SCENE_03_LEAVE",
        "text": (
            "Leave Management gives admins a complete view of all leave requests. "
            "Requests can be filtered by status, date range, or employee name."
        ),
    },
    {
        "id": "SCENE_03_LEAVE_TABS",
        "text": (
            "The inner tabs organize requests by status: All, Pending, Approved, and Rejected. "
            "Switching to Leave Balances shows each employee's remaining leave quota by type."
        ),
    },
    # ── Attendance ───────────────────────────────────────────
    {
        "id": "SCENE_04_ATTENDANCE",
        "text": (
            "Attendance Management shows check-in and check-out records in a data grid. "
            "Admins can filter by date, and the Mark Attendance button allows manual entries."
        ),
    },
    # ── Timesheets ───────────────────────────────────────────
    {
        "id": "SCENE_05_TIMESHEETS",
        "text": (
            "The Timesheet module handles weekly time tracking. Employees log hours "
            "against projects and tasks."
        ),
    },
    {
        "id": "SCENE_05_TIMESHEET_TABS",
        "text": (
            "The admin view has three tabs: My Timesheet for personal entries, "
            "Approvals for reviewing submitted timesheets, "
            "and History for past records."
        ),
    },
    # ── Payroll ──────────────────────────────────────────────
    {
        "id": "SCENE_06_PAYROLL",
        "text": (
            "Payroll Management handles generating, reviewing, and finalizing employee payslips. "
            "The system calculates gross pay, deductions, and net pay automatically."
        ),
    },
    {
        "id": "SCENE_06_PAYROLL_TABS",
        "text": (
            "Three tabs organize the workflow: Overview shows all generated payslips with search, "
            "Generate creates payroll for a specific month, "
            "and Process Payments handles bulk payment processing."
        ),
    },
    # ── Tasks & Projects ─────────────────────────────────────
    {
        "id": "SCENE_07_TASKS",
        "text": (
            "The Tasks and Projects module supports project creation, task assignment, "
            "and status management."
        ),
    },
    {
        "id": "SCENE_07_TASKS_TABS",
        "text": (
            "The Projects tab lists all active projects. "
            "Switching to the Tasks tab shows individual tasks with search and priority filtering."
        ),
    },
    # ── Reviews ──────────────────────────────────────────────
    {
        "id": "SCENE_08_REVIEWS",
        "text": (
            "Performance Reviews follow a structured workflow from creation "
            "through self-assessment, manager rating, and final approval."
        ),
    },
    {
        "id": "SCENE_08_REVIEWS_TABS",
        "text": (
            "Reviews are organized into tabs: All Reviews, Drafts, Pending, and Completed. "
            "The search bar filters reviews by employee name."
        ),
    },
    # ── Organization ─────────────────────────────────────────
    {
        "id": "SCENE_09_ORGANIZATION",
        "text": "Organization settings let admins manage the company structure.",
    },
    {
        "id": "SCENE_09_ORG_TABS",
        "text": (
            "Three tabs are available: Departments for team organization, "
            "Positions for job roles, and Holidays for company-wide calendar management."
        ),
    },
    # ── User Management ──────────────────────────────────────
    {
        "id": "SCENE_10_USER_MGMT",
        "text": (
            "User Management is where admins create accounts, assign roles, "
            "and control system access."
        ),
    },
    {
        "id": "SCENE_10_USER_TABS",
        "text": (
            "The Manage Users tab shows all user accounts with search and role filtering. "
            "The Create User tab provides a validated form for adding new accounts."
        ),
    },
    # ── Reports ──────────────────────────────────────────────
    {
        "id": "SCENE_11_REPORTS",
        "text": (
            "The Reports module generates organization-wide analytics."
        ),
    },
    {
        "id": "SCENE_11_REPORTS_TABS",
        "text": (
            "Four report categories are available: Employee Reports, Leave Reports, "
            "Timesheet Reports, and Payroll Reports. "
            "All reports support date filtering and export to C-S-V."
        ),
    },
    # ── Settings ─────────────────────────────────────────────
    {
        "id": "SCENE_12_SETTINGS",
        "text": "System Settings provide admin-only configuration options.",
    },
    {
        "id": "SCENE_12_SETTINGS_TABS",
        "text": (
            "Three tabs are available: Email for notification setup, "
            "Preferences for display and behavior settings, "
            "and Advanced for system-level configuration."
        ),
    },
    # ── Help / User Guide ────────────────────────────────────
    {
        "id": "SCENE_13_HELP",
        "text": (
            "The built-in User Guide provides searchable, role-filtered help topics. "
            "Each guide includes step-by-step instructions and a recorded video walkthrough. "
            "Guides can be filtered to show only those with video content."
        ),
    },
    # ── Employee Experience ──────────────────────────────────
    {
        "id": "SCENE_14_EMPLOYEE_LOGIN",
        "text": (
            "Now let's switch to the Employee experience. After logging in, "
            "employees see their personalized dashboard."
        ),
    },
    {
        "id": "SCENE_14_DASHBOARD",
        "text": (
            "The employee dashboard shows leave balance, attendance summary, "
            "pending tasks, and recent announcements."
        ),
    },
    {
        "id": "SCENE_14_MY_LEAVE",
        "text": (
            "My Leave shows leave balance cards at the top and a request history below. "
            "Employees can submit new leave requests using the highlighted button."
        ),
    },
    {
        "id": "SCENE_14_MY_TIMESHEET",
        "text": (
            "My Timesheet provides a weekly grid for logging hours against assigned projects. "
            "Employees save drafts, then submit for manager approval."
        ),
    },
    {
        "id": "SCENE_14_MY_ATTENDANCE",
        "text": (
            "My Attendance shows the employee's own check-in and check-out records."
        ),
    },
    {
        "id": "SCENE_14_MY_PAYSLIPS",
        "text": (
            "My Payslips displays summary cards and a table of past payslips. "
            "Employees can filter by year and download payslips in P-D-F format."
        ),
    },
    {
        "id": "SCENE_14_MY_TASKS",
        "text": (
            "My Tasks shows all assigned tasks with priority and status filters. "
            "Employees update task progress directly from this view."
        ),
    },
    {
        "id": "SCENE_14_MY_PROFILE",
        "text": (
            "My Profile lets employees view their personal details, employment information, "
            "salary structure, and statutory details in a scrollable layout."
        ),
    },
    # ── Manager Experience ───────────────────────────────────
    {
        "id": "SCENE_15_MANAGER_LOGIN",
        "text": (
            "Logging in as a Team Manager reveals a focused dashboard "
            "with team-specific metrics and approval queues."
        ),
    },
    {
        "id": "SCENE_15_DASHBOARD",
        "text": (
            "The manager dashboard highlights pending approvals and team attendance. "
        ),
    },
    {
        "id": "SCENE_15_TEAM_VIEW",
        "text": (
            "Managers see only their direct team members, not the entire organization. "
            "This role-based filtering ensures data privacy."
        ),
    },
    {
        "id": "SCENE_15_LEAVE_APPROVALS",
        "text": (
            "The manager's Leave Management view shows pending requests "
            "from their direct reports, ready for approval or rejection."
        ),
    },
    {
        "id": "SCENE_15_TIMESHEET_APPROVALS",
        "text": (
            "Timesheet Approvals lists submitted timesheets from team members. "
            "Managers can review logged hours and approve in bulk."
        ),
    },
    # ── HR Experience ────────────────────────────────────────
    {
        "id": "SCENE_16_HR_LOGIN",
        "text": (
            "The H-R Manager role has broad access to employee records, "
            "leave management, and payroll operations."
        ),
    },
    {
        "id": "SCENE_16_HR_EMPLOYEES",
        "text": (
            "H-R can view and edit all employee records, run reports, "
            "and manage leave configurations."
        ),
    },
    {
        "id": "SCENE_16_HR_PAYROLL",
        "text": (
            "H-R also has full access to Payroll Management, including "
            "generating payroll, finalizing payslips, and marking them as paid."
        ),
    },
    # ── Closing ──────────────────────────────────────────────
    {
        "id": "SCENE_17_CLOSING",
        "text": (
            "That concludes our walkthrough of SkyrakSys H-R-M. "
            "The application delivers a complete, role-based human resource management experience: "
            "from onboarding and attendance tracking, to leave management, timesheets, "
            "payroll processing, performance reviews, and organization settings. "
            "Every feature is accessible through an intuitive, modern interface with "
            "built-in validation, search, and export capabilities. "
            "Thank you for watching."
        ),
    },
]


# ── Utilities ─────────────────────────────────────────────────
def _get_ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"


def _get_clip_duration(ffmpeg, filepath):
    """Return clip duration in seconds using ffmpeg."""
    r = subprocess.run(
        [ffmpeg, "-i", filepath],
        capture_output=True, text=True,
    )
    # Parse "Duration: HH:MM:SS.ff" from stderr
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+)\.(\d+)", r.stderr)
    if m:
        h, mn, s, cs = int(m[1]), int(m[2]), int(m[3]), int(m[4])
        return h * 3600 + mn * 60 + s + cs / 100.0
    return 0.0


# ── TTS Generation ───────────────────────────────────────────
async def generate_audio_clips():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    ffmpeg = _get_ffmpeg()

    clip_paths = []
    durations  = {}       # scene_id → seconds

    for i, scene in enumerate(NARRATION):
        fname = f"{i:02d}_{scene['id']}.mp3"
        fpath = os.path.join(OUTPUT_DIR, fname)

        print(f"  Generating: {fname} ...")
        comm = edge_tts.Communicate(scene["text"], VOICE, rate=RATE)
        await comm.save(fpath)

        dur = _get_clip_duration(ffmpeg, fpath)
        durations[scene["id"]] = round(dur, 2)
        clip_paths.append({"file": fpath, "scene_id": scene["id"], "duration": dur})

    # Save durations so Playwright can read them
    timings_path = os.path.join(ROOT, "demo-output", "clip-timings.json")
    os.makedirs(os.path.dirname(timings_path), exist_ok=True)
    with open(timings_path, "w") as f:
        json.dump(durations, f, indent=2)
    print(f"\n  ✓ clip-timings.json saved ({len(durations)} clips)")

    total = sum(durations.values())
    print(f"  ✓ Total narration length: {total:.1f}s ({total/60:.1f} min)")

    return clip_paths, durations


# ── Build a single narration track with silence gaps ─────────
def _build_narration_track():
    """
    Concatenate all audio clips into one continuous track,
    inserting exact silence gaps between them so each clip
    starts at its marker timestamp.  This avoids the amix
    multi-input artifacts that cause overlapping audio.
    """
    ffmpeg = _get_ffmpeg()
    markers_path = os.path.join(ROOT, "demo-output", "video-markers.json")
    if not os.path.exists(markers_path):
        print(f"  ✗ Missing {markers_path} — record the demo first.")
        sys.exit(1)

    markers = json.load(open(markers_path))
    ts_map = {m["label"]: m["time_ms"] for m in markers}

    timings_path = os.path.join(ROOT, "demo-output", "clip-timings.json")
    durations = json.load(open(timings_path)) if os.path.exists(timings_path) else {}

    # Build ordered list: (start_ms, clip_file, duration_s)
    # Only include clips that have a matching marker in the video
    segments = []
    for i, scene in enumerate(NARRATION):
        fname = f"{i:02d}_{scene['id']}.mp3"
        fpath = os.path.join(OUTPUT_DIR, fname)
        if not os.path.exists(fpath):
            print(f"  ⚠ Missing clip: {fname}, skipping")
            continue
        if scene["id"] not in ts_map:
            print(f"  ⚠ No marker for {scene['id']} — skipping (not in video)")
            continue
        start_ms = ts_map[scene["id"]]
        dur_s    = durations.get(scene["id"], _get_clip_duration(ffmpeg, fpath))
        segments.append((start_ms, fpath, dur_s, scene["id"]))

    if not segments:
        print("  ✗ No audio clips found."); return None

    # Create a concat list file: silence gap → clip → silence gap → clip ...
    concat_dir = os.path.join(ROOT, "demo-output", "_tmp_concat")
    os.makedirs(concat_dir, exist_ok=True)
    concat_list = os.path.join(concat_dir, "list.txt")
    cursor_ms = 0  # current position in the timeline

    with open(concat_list, "w") as f:
        for idx, (start_ms, clip_path, dur_s, scene_id) in enumerate(segments):
            gap_ms = start_ms - cursor_ms
            if gap_ms < 0:
                # Previous clip overruns into this one — trim by starting later
                print(f"    ⚠ {scene_id}: overlap by {-gap_ms}ms — clamping gap to 0")
                gap_ms = 0

            if gap_ms > 0:
                # Generate a silence file for the gap
                silence_file = os.path.join(concat_dir, f"silence_{idx:02d}.mp3")
                gap_s = gap_ms / 1000.0
                subprocess.run([
                    ffmpeg,
                    "-f", "lavfi",
                    "-i", f"anullsrc=r=44100:cl=mono",
                    "-t", f"{gap_s:.3f}",
                    "-c:a", "libmp3lame",
                    "-q:a", "9",
                    "-y", silence_file,
                ], capture_output=True)
                # Use forward slashes for ffmpeg concat
                f.write(f"file '{silence_file.replace(os.sep, '/')}'\n")

            f.write(f"file '{clip_path.replace(os.sep, '/')}'\n")
            cursor_ms = start_ms + int(dur_s * 1000)

    # Concatenate everything into one track
    narration_track = os.path.join(ROOT, "demo-output", "demo-narration-synced.mp3")
    subprocess.run([
        ffmpeg,
        "-f", "concat", "-safe", "0",
        "-i", concat_list,
        "-c:a", "libmp3lame",
        "-q:a", "2",
        "-y", narration_track,
    ], capture_output=True)

    # Clean up temp files
    import shutil
    shutil.rmtree(concat_dir, ignore_errors=True)

    dur = _get_clip_duration(ffmpeg, narration_track)
    size_kb = os.path.getsize(narration_track) / 1024
    print(f"  ✓ Narration track: {dur:.1f}s, {size_kb:.0f} KB")
    return narration_track


# ── Combine video + audio ────────────────────────────────────
def combine_video_audio(video_path):
    """
    Build a single narration track with silence-padded gaps,
    then overlay it on the video — no multi-stream amix needed.
    """
    ffmpeg = _get_ffmpeg()

    print("  Building single narration track ...")
    narration_track = _build_narration_track()
    if not narration_track:
        return

    output = os.path.join(ROOT, "demo-output", "SkyrakSys_HRM_Demo.mp4")
    cmd = [
        ffmpeg,
        "-i", video_path,
        "-i", narration_track,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-y", output,
    ]

    print(f"\n  Combining video + narration → {output} ...")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("  ✗ ffmpeg error:\n" + r.stderr[-2000:])
        sys.exit(1)

    size_mb = os.path.getsize(output) / (1024 * 1024)
    print(f"  ✓ Final demo: {output}  ({size_mb:.1f} MB)")
    return output


# ── Main ──────────────────────────────────────────────────────
async def main():
    parser = argparse.ArgumentParser(description="SkyrakSys HRM Demo Voiceover")
    parser.add_argument("--combine", action="store_true",
                        help="Combine audio with recorded video")
    parser.add_argument("--video", type=str,
                        help="Path to the recorded demo .webm video")
    parser.add_argument("--combine-only", action="store_true",
                        help="Skip audio generation, only combine")
    args = parser.parse_args()

    print("═" * 60)
    print("  SkyrakSys HRM — Demo Voiceover Generator  v2")
    print("═" * 60)

    if not args.combine_only:
        print(f"\n1. Generating {len(NARRATION)} narration clips (voice: {VOICE}) ...")
        clips, durations = await generate_audio_clips()

        # Save narration script as JSON for reference
        script_path = os.path.join(ROOT, "demo-output", "narration-script.json")
        with open(script_path, "w") as f:
            json.dump(NARRATION, f, indent=2)
        print(f"  ✓ Narration script saved: {script_path}")

    if args.combine or args.combine_only:
        if not args.video:
            print("\n  ✗ Provide --video path/to/video.webm"); sys.exit(1)
        print(f"\n2. Combining with video: {args.video}")
        combine_video_audio(args.video)

    if not args.combine and not args.combine_only:
        print("\n  Next steps:")
        print("    1. cd frontend && npx playwright test -c playwright-demo.config.js demo-walkthrough")
        print("    2. python scripts/generate-demo-voiceover.py --combine-only --video <path-to-video.webm>")

    print("\n" + "═" * 60)
    print("  Done!")
    print("═" * 60)


if __name__ == "__main__":
    asyncio.run(main())
