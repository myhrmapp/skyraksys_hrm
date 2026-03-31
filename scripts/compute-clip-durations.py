"""Compute MP3 durations for all narration clips → clip-durations.json"""
import json
import re
import subprocess
import shutil
from pathlib import Path

ROOT      = Path(__file__).resolve().parent.parent
FFMPEG    = ROOT / "frontend" / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"
AUDIO_DIR = ROOT / "demo-output-mobile" / "audio"
MANIFEST  = AUDIO_DIR / "clips-manifest.json"
OUT_FILE  = AUDIO_DIR / "clip-durations.json"


def find_ffmpeg():
    if FFMPEG.exists():
        return str(FFMPEG)
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    raise FileNotFoundError("ffmpeg not found")


def get_duration(ffmpeg, path):
    r = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path)],
                       capture_output=True, text=True, timeout=15)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", r.stderr)
    if not m:
        return 18.0
    h, mn, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
    return h * 3600 + mn * 60 + s


def main():
    ffmpeg   = find_ffmpeg()
    manifest = json.loads(MANIFEST.read_text())
    durations = {}
    print(f"Computing durations for {len(manifest)} clips...\n")
    for entry in manifest:
        label      = entry["label"]
        audio_file = AUDIO_DIR / entry["file"]
        if not audio_file.exists():
            print(f"  ⚠  Missing: {audio_file}")
            durations[label] = 18.0
            continue
        dur = get_duration(ffmpeg, audio_file)
        durations[label] = round(dur, 2)
        print(f"  {label:42s}  {dur:.2f}s")

    OUT_FILE.write_text(json.dumps(durations, indent=2))
    print(f"\n✅  Written: {OUT_FILE}")


if __name__ == "__main__":
    main()
