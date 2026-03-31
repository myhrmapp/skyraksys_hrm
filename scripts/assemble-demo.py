"""
SkyrakSys HRM Demo — Video + Voiceover Assembly (no-overlap)
=============================================================
Each voiceover clip is trimmed to its CUE WINDOW (time from this cue
to the next cue) so clips never bleed into each other.

Output:
    demo-output/demo-final.mp4   (H.264 video + AAC audio)

Requires:
    pip install imageio[ffmpeg]
"""

import json
import re
import subprocess
import sys
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────
ROOT    = Path(r"d:\skyraksys_hrm1\skyraksys_hrm_app")
AUDIO   = ROOT / "demo-output" / "audio"
MARKERS = ROOT / "demo-output" / "video-markers-v2.json"
OUTPUT  = ROOT / "demo-output" / "demo-final.mp4"
RESULTS = ROOT / "frontend" / "test-results"

video_candidates = list(RESULTS.rglob("video.webm"))
if not video_candidates:
    print("ERROR: video.webm not found under frontend/test-results")
    sys.exit(1)
VIDEO = video_candidates[0]
print(f"Video  : {VIDEO}  ({VIDEO.stat().st_size / 1024 / 1024:.1f} MB)")

# ── FFmpeg binary ────────────────────────────────────────────────────────
try:
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG = "ffmpeg"
print(f"FFmpeg : {FFMPEG}\n")

# ── Helper: get audio/video duration via ffmpeg -i ───────────────────────
def get_duration(path):
    r = subprocess.run(
        [FFMPEG, "-i", str(path)],
        capture_output=True, text=True
    )
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", r.stderr)
    if m:
        return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    return None

video_dur = get_duration(VIDEO)
print(f"Video duration : {video_dur:.2f}s\n")

# ── Load markers ─────────────────────────────────────────────────────────
markers = json.loads(MARKERS.read_text(encoding="utf-8"))
t0_ms   = markers[0]["time"]

# ── Build clips list — each trimmed to its cue window ────────────────────
clips = []
for i, m in enumerate(markers):
    label    = m["label"]
    fname    = label.replace(".", "_") + ".mp3"
    path     = AUDIO / fname
    if not path.exists():
        print(f"  MISSING: {path}")
        sys.exit(1)

    delay_s  = (m["time"] - t0_ms) / 1000.0
    delay_ms = int(round(delay_s * 1000))

    # Window = gap to next cue; last clip gets its actual duration
    if i + 1 < len(markers):
        next_offset = (markers[i + 1]["time"] - t0_ms) / 1000.0
        window_s    = next_offset - delay_s
    else:
        window_s = get_duration(path) or 30.0

    clip_dur = get_duration(path) or window_s
    use_dur  = min(clip_dur, window_s)   # ← trim to window, no overlap

    print(f"  [{i+1:02d}] {label:42s}  @{delay_s:7.2f}s  "
          f"window={window_s:6.2f}s  clip={clip_dur:.2f}s  trim={use_dur:.2f}s")
    clips.append((str(path), delay_ms, use_dur, label))

print(f"\n{len(clips)} clips — building filter_complex...")

# ── Build filter_complex ──────────────────────────────────────────────────
# [N:a] atrim=duration=W, asetpts=PTS-STARTPTS, adelay=D:all=1 [aN]
filter_parts = []
audio_labels  = []
for i, (path, delay_ms, use_dur, label) in enumerate(clips):
    idx    = i + 1
    alabel = f"a{i}"
    filter_parts.append(
        f"[{idx}:a]atrim=duration={use_dur:.3f},"
        f"asetpts=PTS-STARTPTS,"
        f"adelay={delay_ms}:all=1[{alabel}]"
    )
    audio_labels.append(f"[{alabel}]")

n    = len(clips)
amix = (f"{''.join(audio_labels)}"
        f"amix=inputs={n}:normalize=0:dropout_transition=0[aout]")
filter_complex = ";".join(filter_parts) + ";" + amix

# ── Build FFmpeg command ──────────────────────────────────────────────────
cmd = [FFMPEG, "-y"]
cmd += ["-i", str(VIDEO)]
for path, _, _, _ in clips:
    cmd += ["-i", path]

cmd += [
    "-filter_complex", filter_complex,
    "-map", "0:v",
    "-map", "[aout]",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-c:a", "aac",
    "-b:a", "128k",          # mono clips at 24kHz — 128k is the safe ceiling
    "-movflags", "+faststart",
    str(OUTPUT),
]

print(f"\nOutput : {OUTPUT}")
print(f"Running FFmpeg ({n} audio inputs, trimmed to windows)...\n")

# ── Execute ───────────────────────────────────────────────────────────────
result = subprocess.run(cmd)

if result.returncode == 0:
    sz = OUTPUT.stat().st_size
    print(f"\n✅  Assembly complete!")
    print(f"    File   : {OUTPUT}")
    print(f"    Size   : {sz / 1024 / 1024:.1f} MB")
else:
    print(f"\n❌  FFmpeg failed (exit {result.returncode})")
    sys.exit(result.returncode)
