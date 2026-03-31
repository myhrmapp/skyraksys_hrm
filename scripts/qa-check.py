import os, json

AUDIO = r"d:\skyraksys_hrm1\skyraksys_hrm_app\demo-output\audio"
MARKERS = r"d:\skyraksys_hrm1\skyraksys_hrm_app\demo-output\video-markers-v2.json"
VIDEO = r"d:\skyraksys_hrm1\skyraksys_hrm_app\frontend\test-results\demo-v2-SkyrakSys-HRM-\u2014-Fu-47301-mo-Recording-\u2014-All-Personas-demo-hd\video.webm"

markers = json.load(open(MARKERS))
issues = []

for i, m in enumerate(markers):
    lbl = m["label"]
    fname = lbl.replace(".", "_") + ".mp3"
    path = os.path.join(AUDIO, fname)
    if not os.path.exists(path):
        issues.append(f"  MISSING: {fname}")
    else:
        sz = os.path.getsize(path)
        if sz < 20000:
            issues.append(f"  TOO SMALL ({sz} bytes): {fname}")
        else:
            print(f"  [{i+1:02d}] OK  {sz:>7,}b  {lbl}")

print()
if issues:
    print("ISSUES FOUND:")
    for x in issues:
        print(x)
else:
    print(f"ALL {len(markers)} clips OK")

# video
if os.path.exists(VIDEO):
    vsz = os.path.getsize(VIDEO)
    print(f"Video: {vsz:,} bytes ({vsz/1024/1024:.1f} MB)  OK")
else:
    print("VIDEO NOT FOUND at expected path")

# timing
t0 = markers[0]["time"]
t1 = markers[-1]["time"]
print(f"Cue span: {(t1-t0)/1000:.1f}s  ({len(markers)} cues, first={markers[0]['label']}, last={markers[-1]['label']})")
