import json

# Video markers (scene name: start time in ms)
video_markers = {
    "INTRO": 0,
    "SCENE_01_LOGIN": 15728,
    "SCENE_01_ADMIN_LOGIN": 26852,
    "SCENE_01_DASHBOARD": 32666,
    "SCENE_01_DASHBOARD_SCROLL": 44552,
    "SCENE_02_EMPLOYEES": 53609,
    "SCENE_02_SEARCH": 65386,
    "SCENE_02_PROFILE": 71676,
    "SCENE_02_PROFILE_SECTIONS": 76699,
    "SCENE_02_ADD_EMPLOYEE": 92783,
    "SCENE_03_LEAVE": 104515,
    "SCENE_03_LEAVE_TABS": 114742,
    "SCENE_04_ATTENDANCE": 131577,
    "SCENE_05_TIMESHEETS": 142330,
    "SCENE_05_TIMESHEET_TABS": 150498,
    "SCENE_06_PAYROLL": 191438,
    "SCENE_07_TASKS": 215473,
    "SCENE_07_TASKS_TABS": 222677,
    "SCENE_08_REVIEWS": 232715,
    "SCENE_08_REVIEWS_TABS": 240920,
    "SCENE_09_ORGANIZATION": 253144,
    "SCENE_09_ORG_TABS": 258271,
    "SCENE_10_USER_MGMT": 270537,
    "SCENE_10_USER_TABS": 277305,
    "SCENE_11_REPORTS": 287750,
    "SCENE_11_REPORTS_TABS": 292730,
    "SCENE_12_SETTINGS": 307285,
    "SCENE_12_SETTINGS_TABS": 312531,
    "SCENE_13_HELP": 324597,
    "SCENE_14_EMPLOYEE_LOGIN": 339525,
    "SCENE_14_DASHBOARD": 347976,
    "SCENE_14_MY_LEAVE": 355192,
    "SCENE_14_MY_TIMESHEET": 365278,
    "SCENE_14_MY_ATTENDANCE": 533616,
    "SCENE_14_MY_PAYSLIPS": 538667,
    "SCENE_14_MY_TASKS": 548910,
    "SCENE_14_MY_PROFILE": 567519,
    "SCENE_15_MANAGER_LOGIN": 582260,
    "SCENE_15_DASHBOARD": 589435,
    "SCENE_15_TEAM_VIEW": 594562,
    "SCENE_15_LEAVE_APPROVALS": 603982,
    "SCENE_15_TIMESHEET_APPROVALS": 611814,
    "SCENE_16_HR_LOGIN": 620746,
    "SCENE_16_HR_EMPLOYEES": 628074,
    "SCENE_16_HR_PAYROLL": 634980,
    "SCENE_17_CLOSING": 643717,
}

# Audio durations (scene name: seconds)
audio_durations = {
    "INTRO": 15.22,
    "SCENE_01_LOGIN": 10.61,
    "SCENE_01_ADMIN_LOGIN": 4.92,
    "SCENE_01_DASHBOARD": 11.38,
    "SCENE_01_DASHBOARD_SCROLL": 8.54,
    "SCENE_02_EMPLOYEES": 11.26,
    "SCENE_02_SEARCH": 5.78,
    "SCENE_02_PROFILE": 4.51,
    "SCENE_02_PROFILE_SECTIONS": 15.58,
    "SCENE_02_ADD_EMPLOYEE": 9.98,
    "SCENE_03_LEAVE": 9.72,
    "SCENE_03_LEAVE_TABS": 11.66,
    "SCENE_04_ATTENDANCE": 10.25,
    "SCENE_05_TIMESHEETS": 7.66,
    "SCENE_05_TIMESHEET_TABS": 8.81,
    "SCENE_06_PAYROLL": 11.16,
    "SCENE_06_PAYROLL_TABS": 11.14,
    "SCENE_07_TASKS": 6.7,
    "SCENE_07_TASKS_TABS": 9.53,
    "SCENE_08_REVIEWS": 7.7,
    "SCENE_08_REVIEWS_TABS": 9.62,
    "SCENE_09_ORGANIZATION": 4.61,
    "SCENE_09_ORG_TABS": 8.42,
    "SCENE_10_USER_MGMT": 6.26,
    "SCENE_10_USER_TABS": 9.94,
    "SCENE_11_REPORTS": 4.46,
    "SCENE_11_REPORTS_TABS": 11.86,
    "SCENE_12_SETTINGS": 4.73,
    "SCENE_12_SETTINGS_TABS": 9.12,
    "SCENE_13_HELP": 14.42,
    "SCENE_14_EMPLOYEE_LOGIN": 7.94,
    "SCENE_14_DASHBOARD": 6.7,
    "SCENE_14_MY_LEAVE": 9.58,
    "SCENE_14_MY_TIMESHEET": 9.74,
    "SCENE_14_MY_ATTENDANCE": 4.54,
    "SCENE_14_MY_PAYSLIPS": 9.74,
    "SCENE_14_MY_TASKS": 9.24,
    "SCENE_14_MY_PROFILE": 9.07,
    "SCENE_15_MANAGER_LOGIN": 6.67,
    "SCENE_15_DASHBOARD": 4.61,
    "SCENE_15_TEAM_VIEW": 8.9,
    "SCENE_15_LEAVE_APPROVALS": 7.32,
    "SCENE_15_TIMESHEET_APPROVALS": 8.42,
    "SCENE_16_HR_LOGIN": 6.82,
    "SCENE_16_HR_EMPLOYEES": 6.36,
    "SCENE_16_HR_PAYROLL": 8.23,
    "SCENE_17_CLOSING": 27.48,
}

# Sort markers by time
scene_order = sorted(video_markers.items(), key=lambda x: x[1])

rows = []
total_audio = 0
for i in range(1, len(scene_order)):
    prev_scene, prev_time = scene_order[i-1]
    curr_scene, curr_time = scene_order[i]
    wall_gap = curr_time - prev_time
    audio_sec = audio_durations.get(prev_scene, 0)
    audio_ms = int(audio_sec * 1000)
    total_audio += audio_sec
    audio_plus_buffer = audio_ms + 500
    dead_time = wall_gap - audio_plus_buffer
    flag = "YES" if dead_time > 5000 else ""
    rows.append({
        "from": prev_scene,
        "to": curr_scene,
        "wall_gap_s": round(wall_gap/1000, 2),
        "audio_s": round(audio_sec, 2),
        "dead_time_s": round(dead_time/1000, 2),
        "flag": flag
    })

# Compute total video duration
video_start = scene_order[0][1]
video_end = scene_order[-1][1]
total_video = (video_end - video_start) / 1000

def print_table(rows):
    print(f"{'From':<25} {'To':<25} {'Wall Gap(s)':>12} {'Audio(s)':>10} {'Dead Time(s)':>14} {'Flag':>6}")
    print("-"*90)
    for r in rows:
        print(f"{r['from']:<25} {r['to']:<25} {r['wall_gap_s']:>12.2f} {r['audio_s']:>10.2f} {r['dead_time_s']:>14.2f} {r['flag']:>6}")

print_table(rows)
print("\nTotal video duration (s):", round(total_video,2))
print("Total audio duration (s):", round(total_audio,2))
