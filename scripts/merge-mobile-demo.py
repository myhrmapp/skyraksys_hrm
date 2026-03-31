"""
SkyrakSys HRM — Mobile Demo Video + Voiceover Merger
======================================================
Structure of the final video:
  [INTRO TITLE CARD]  +  [Employee recording]  +  [Manager recording]

  Audio layout:
    t = 1.0s               → INTRO.welcome  (plays over title card)
    t = intro_dur + 0.5s   → EMPLOYEE.login (recording starts here)
    each subsequent clip plays sequentially after the previous ends

Usage:
    python scripts/merge-mobile-demo.py [--video-dir path]
"""

import os
import re
import sys
import json
import glob
import shutil
import argparse
import subprocess
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
ROOT      = Path(__file__).resolve().parent.parent
FRONTEND  = ROOT / "frontend"
RESULTS   = FRONTEND / "test-results"
MARKERS   = RESULTS / "mobile-demo-markers.json"
AUDIO_DIR = ROOT / "demo-output-mobile" / "audio"
MANIFEST  = AUDIO_DIR / "clips-manifest.json"
OUT_DIR   = ROOT / "demo-output-mobile"
FINAL_MP4 = OUT_DIR / "SkyrakSys_Mobile_Demo.mp4"

FFMPEG_STATIC = FRONTEND / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"

GAP_MS = 500   # silence gap (ms) between consecutive narration clips


# ---------------------------------------------------------------------------
def find_ffmpeg():
    if FFMPEG_STATIC.exists():
        return str(FFMPEG_STATIC)
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    raise FileNotFoundError("ffmpeg not found. Run: npm install ffmpeg-static")


def ffrun(cmd, label=""):
    """Run ffmpeg command; print stderr and raise on failure."""
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        if label:
            print(f"  ✗ {label} failed (exit {result.returncode})")
        print(result.stderr.decode(errors="replace")[-3000:])
        raise subprocess.CalledProcessError(result.returncode, cmd)
    return result


def get_duration(ffmpeg, path):
    """Return media duration in seconds."""
    result = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path)],
                            capture_output=True, text=True, timeout=30)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", result.stderr)
    if not m:
        raise ValueError(f"Cannot parse duration: {path}")
    h, mn, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
    return h * 3600 + mn * 60 + s


def get_video_size(ffmpeg, path):
    """Return (width, height) of the first video stream."""
    result = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path)],
                            capture_output=True, text=True, timeout=30)
    m = re.search(r"Stream.*Video.*?\s(\d{3,4})x(\d{3,4})", result.stderr)
    return (int(m.group(1)), int(m.group(2))) if m else (390, 844)


def find_webm_videos(video_dir: Path):
    pattern = str(video_dir / "**" / "*.webm")
    videos = sorted(glob.glob(pattern, recursive=True), key=os.path.getmtime)
    if not videos:
        raise FileNotFoundError(f"No .webm files found in {video_dir}")
    return videos


def make_intro_card(ffmpeg, width, height, duration, tmpdir):
    """
    Create an animated title card (dark background with text).
    Tries several Windows font paths; falls back to a plain colour card.
    """
    out = os.path.join(tmpdir, "intro_card.mp4")
    bg       = "0x0f172a"   # slate-900
    fg       = "white"
    sub_fg   = "0xa0aec0"   # slate-400
    acc_fg   = "0x6366f1"   # indigo-500

    win_fonts = [
        r"C\:/Windows/Fonts/arialbd.ttf",
        r"C\:/Windows/Fonts/arial.ttf",
        r"C\:/Windows/Fonts/calibrib.ttf",
        r"C\:/Windows/Fonts/calibri.ttf",
    ]
    for font in win_fonts:
        vf = (
            f"drawtext=fontfile='{font}':"
            f"text='SkyrakSys HRM':fontsize=52:fontcolor={fg}:"
            f"x=(w-text_w)/2:y=(h/2-90),"

            f"drawtext=fontfile='{font}':"
            f"text='Human Resource Management':fontsize=24:fontcolor={sub_fg}:"
            f"x=(w-text_w)/2:y=(h/2-20),"

            f"drawtext=fontfile='{font}':"
            f"text='Mobile App Demo':fontsize=20:fontcolor={acc_fg}:"
            f"x=(w-text_w)/2:y=(h/2+30)"
        )
        cmd = [
            ffmpeg, "-hide_banner", "-y",
            "-f", "lavfi", "-i", f"color=c={bg}:size={width}x{height}:rate=30",
            "-vf", vf,
            "-t", str(duration),
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-pix_fmt", "yuv420p", out,
        ]
        if subprocess.run(cmd, capture_output=True).returncode == 0:
            print(f"  ✓ Intro card: {width}x{height}, {duration:.1f}s")
            return out

    # Fallback: plain colour card
    print("  ⚠ drawtext unavailable — using plain colour intro card")
    cmd = [
        ffmpeg, "-hide_banner", "-y",
        "-f", "lavfi", "-i", f"color=c={bg}:size={width}x{height}:rate=30",
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-pix_fmt", "yuv420p", out,
    ]
    ffrun(cmd, "plain intro card")
    return out


def encode_to_mp4(ffmpeg, src, tmpdir, name=None):
    """Re-encode a video file (webm/mp4) to h264 MP4; strips embedded audio."""
    out = os.path.join(tmpdir, name or (Path(src).stem + ".mp4"))
    cmd = [
        ffmpeg, "-hide_banner", "-y",
        "-i", str(src),
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-pix_fmt", "yuv420p", "-an",
        out,
    ]
    ffrun(cmd, f"encode {Path(src).name}")
    return out


def concat_mp4s(ffmpeg, mp4_files, tmpdir):
    """Concatenate h264 MP4 files using ffmpeg concat demuxer."""
    if len(mp4_files) == 1:
        return mp4_files[0]
    list_file = os.path.join(tmpdir, "concat.txt")
    with open(list_file, "w") as f:
        for p in mp4_files:
            # Use forward slashes; ffmpeg concat demuxer requires them on Windows
            fwd = str(p).replace("\\", "/")
            f.write(f"file '{fwd}'\n")
    out = os.path.join(tmpdir, "joined.mp4")
    ffrun([ffmpeg, "-hide_banner", "-y",
           "-f", "concat", "-safe", "0",
           "-i", list_file,
           "-c", "copy",
           "-reset_timestamps", "1",
           out], "concat")
    return out


def build_audio_track(ffmpeg, markers, manifest_by_label,
                      intro_card_dur, recording_dur, tmpdir):
    """
    Place each clip using the actual marker timestamps recorded during Playwright.

    Layout in the final video:
      [intro card]  <-- intro_card_dur seconds  -->  [recording]
      INTRO.welcome starts at t=1.0s (inside the title card)
      Every other clip starts at:
          intro_card_dur + (marker.time - first_recording_marker.time) / 1000

    Because narrate() now pauses for the full clip duration, the marker
    timestamps naturally reflect when each scene becomes visible, so placing
    the audio at those offsets produces perfect sync.
    """
    if not markers:
        print("  ⚠ No markers — skipping audio")
        return None

    INTRO_LABEL = "INTRO.welcome"

    # Find the timestamp of the first recording marker (first non-INTRO marker)
    recording_start_time = None
    for m in markers:
        if m["label"] != INTRO_LABEL:
            recording_start_time = m["time"]
            break

    if recording_start_time is None:
        print("  ⚠ No recording markers found — cannot sync audio")
        return None

    inputs, parts = [], []
    n = 0

    for marker in markers:
        label = marker["label"]
        if label not in manifest_by_label:
            print(f"  ⚠ No clip for '{label}' — skipping")
            continue
        audio_file = AUDIO_DIR / manifest_by_label[label]["file"]
        if not audio_file.exists():
            print(f"  ⚠ Missing: {audio_file} — skipping")
            continue

        clip_dur = get_duration(ffmpeg, audio_file)

        if label == INTRO_LABEL:
            # Play over title card starting at 1s
            delay_ms = 1000
        else:
            # Offset relative to when the recording started
            rel_ms   = marker["time"] - recording_start_time
            delay_ms = int(intro_card_dur * 1000) + rel_ms

        delay_ms = max(0, delay_ms)
        print(f"    {label:42s}  @ {delay_ms/1000:6.1f}s  ({clip_dur:.1f}s)")

        inputs.extend(["-i", str(audio_file)])
        parts.append(f"[{n}]adelay={delay_ms}|{delay_ms}[a{n}]")
        n += 1

    if n == 0:
        print("  ⚠ No valid clips — no audio track")
        return None

    total_video = intro_card_dur + recording_dur
    mix      = "".join(f"[a{i}]" for i in range(n))
    fcomplex = ";".join(parts) + f";{mix}amix=inputs={n}:normalize=0[aout]"

    composite = os.path.join(tmpdir, "composite_audio.aac")
    cmd = (
        [ffmpeg, "-hide_banner", "-y"]
        + inputs
        + ["-filter_complex", fcomplex, "-map", "[aout]",
           "-t", str(total_video), composite]
    )
    print(f"\n  Building composite audio ({n} clips, marker-timestamp sync)...")
    ffrun(cmd, "composite audio")
    return composite


def final_merge(ffmpeg, video, audio, output):
    """Mux video + audio, copy video stream, encode audio to aac."""
    cmd = [
        ffmpeg, "-hide_banner", "-y",
        "-i", str(video), "-i", str(audio),
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        "-shortest",
        str(output),
    ]
    ffrun(cmd, "final merge")


# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-dir", default=None)
    args = parser.parse_args()

    ffmpeg = find_ffmpeg()
    print(f"\n🎬  Mobile Demo Merger  (intro card + sequential voiceover)")
    print(f"   ffmpeg : {ffmpeg}")

    if not MARKERS.exists():
        raise FileNotFoundError(f"Markers not found: {MARKERS}\nRun Playwright demo first.")
    markers = json.loads(MARKERS.read_text())
    print(f"   Markers : {len(markers)} cues")

    if not MANIFEST.exists():
        raise FileNotFoundError(f"Manifest not found: {MANIFEST}\nRun generate-mobile-voiceover.py first.")
    manifest = json.loads(MANIFEST.read_text())
    manifest_by_label = {e["label"]: e for e in manifest}
    print(f"   Audio   : {len(manifest)} clips")

    vdir   = Path(args.video_dir) if args.video_dir else RESULTS
    videos = find_webm_videos(vdir)[-2:]
    print(f"   Videos  : {len(videos)}")
    for v in videos:
        print(f"     {v}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:

        # 1. Detect recording dimensions from first webm
        w, h = get_video_size(ffmpeg, videos[0])
        print(f"\n   Resolution : {w}x{h}")

        # 2. Derive intro card duration from marker timestamps
        #    = time from INTRO.welcome narrate() call to EMPLOYEE.login narrate() call
        #    (which equals the INTRO.welcome clip duration + login() execution time)
        intro_marker = next((m for m in markers if m["label"] == "INTRO.welcome"), None)
        login_marker = next((m for m in markers if m["label"] != "INTRO.welcome"), None)
        if intro_marker and login_marker:
            intro_to_login_s = (login_marker["time"] - intro_marker["time"]) / 1000
            intro_card_dur   = intro_to_login_s  # card lasts exactly until recording starts
            print(f"   Intro→Login gap: {intro_to_login_s:.1f}s  →  card: {intro_card_dur:.1f}s")
        else:
            intro_audio = AUDIO_DIR / manifest_by_label.get(
                "INTRO.welcome", {"file": "INTRO_welcome.mp3"})["file"]
            intro_clip_dur = get_duration(ffmpeg, intro_audio) if intro_audio.exists() else 18.0
            intro_card_dur = intro_clip_dur + 2.0
            print(f"   Intro clip fallback: {intro_clip_dur:.1f}s  →  card: {intro_card_dur:.1f}s")

        # 3. Build intro title card
        print("\n── Intro title card ──")
        intro_card = make_intro_card(ffmpeg, w, h, intro_card_dur, tmpdir)

        # 4. Re-encode recordings (webm → h264 mp4, strip embedded audio)
        print("\n── Encoding recordings ──")
        encoded = [encode_to_mp4(ffmpeg, v, tmpdir, f"rec{i}.mp4")
                   for i, v in enumerate(videos)]

        # 5. Concat: intro card + recordings
        print("\n── Concatenating ──")
        all_parts   = [intro_card] + encoded
        final_video = concat_mp4s(ffmpeg, all_parts, tmpdir)
        recording_dur = sum(get_duration(ffmpeg, v) for v in encoded)
        total_dur     = get_duration(ffmpeg, final_video)
        print(f"   Card: {intro_card_dur:.1f}s | Recording: {recording_dur:.1f}s | Total: {total_dur:.1f}s")

        # 6. Build composite audio
        print("\n── Placing audio clips ──")
        audio_track = build_audio_track(
            ffmpeg, markers, manifest_by_label,
            intro_card_dur=intro_card_dur,
            recording_dur=recording_dur,
            tmpdir=tmpdir,
        )

        # 7. Final merge
        print(f"\n── Merging → {FINAL_MP4.name} ──")
        if audio_track:
            final_merge(ffmpeg, final_video, audio_track, FINAL_MP4)
        else:
            shutil.copy(final_video, FINAL_MP4)

    size_mb = FINAL_MP4.stat().st_size / 1024 / 1024
    print(f"\n✅  Done! → {FINAL_MP4}")
    print(f"   Size: {size_mb:.1f} MB  |  Duration: {total_dur:.1f}s ({total_dur/60:.1f} min)")


if __name__ == "__main__":
    main()
