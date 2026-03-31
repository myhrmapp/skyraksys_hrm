"""
SkyrakSys HRM Demo — Video + Voiceover Merger
===============================================
After the Playwright HD recording has completed, this script:
  1. Finds the latest .webm video in frontend/test-results/
  2. Reads demo-output/video-markers-v2.json for narration timing
  3. Reads demo-output/audio/clips-manifest.json for audio clip paths
  4. Builds a timed composite audio track using ffmpeg
  5. Merges audio + video → demo-output/SkyrakSys_HRM_Demo_v2.mp4

Usage:
    python scripts/merge-demo.py [--video path/to/recording.webm] [--offset 4.0]

Arguments:
    --video   Path to the recorded .webm file (auto-detected if omitted)
    --offset  Seconds from video start to first narration cue (default: 4.0)
"""

import os
import sys
import json
import glob
import shutil
import argparse
import subprocess
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT        = Path(__file__).resolve().parent.parent
FRONTEND    = ROOT / "frontend"
DEMO_OUT    = ROOT / "demo-output"
AUDIO_DIR   = DEMO_OUT / "audio"
MARKERS_V2  = DEMO_OUT / "video-markers-v2.json"
MANIFEST    = AUDIO_DIR / "clips-manifest.json"
FINAL_MP4   = DEMO_OUT / "SkyrakSys_HRM_Demo_v2.mp4"

# ffmpeg-static binary bundled via npm
FFMPEG_STATIC = FRONTEND / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"

# ---------------------------------------------------------------------------

def find_ffmpeg():
    """Return path to ffmpeg binary — prefer ffmpeg-static, then system PATH."""
    if FFMPEG_STATIC.exists():
        return str(FFMPEG_STATIC)
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    raise FileNotFoundError(
        "ffmpeg not found. Install via: npm install ffmpeg-static  "
        "or winget install Gyan.FFmpeg"
    )


def find_latest_video():
    """Find the most recently created Playwright .webm recording."""
    pattern = str(FRONTEND / "test-results" / "**" / "*.webm")
    videos = glob.glob(pattern, recursive=True)
    if not videos:
        raise FileNotFoundError(
            f"No .webm recordings found in {FRONTEND / 'test-results'}.\n"
            "Run the Playwright recording first:\n"
            "  cd frontend && npx playwright test -c playwright-demo-hd.config.js demo-v2"
        )
    latest = max(videos, key=os.path.getmtime)
    print(f"  Found video: {latest}")
    return latest


def get_video_duration(ffmpeg, video_path):
    """Return video duration in seconds — uses ffmpeg -i and parses Duration line."""
    import re
    try:
        result = subprocess.run(
            [ffmpeg, "-hide_banner", "-i", video_path],
            capture_output=True, text=True, timeout=30
        )
        # ffmpeg prints "Duration: HH:MM:SS.ms," to stderr
        match = re.search(r'Duration:\s*(\d+):(\d+):([\d.]+)', result.stderr)
        if match:
            h, m, s = int(match.group(1)), int(match.group(2)), float(match.group(3))
            duration = h * 3600 + m * 60 + s
            return duration
    except Exception:
        pass
    # Fallback: use the cue sheet total (last marker timestamp)
    return 700.0


def load_markers():
    if not MARKERS_V2.exists():
        raise FileNotFoundError(
            f"Narration markers not found: {MARKERS_V2}\n"
            "This file is created when the Playwright test runs successfully."
        )
    with open(MARKERS_V2, encoding="utf-8") as f:
        return json.load(f)


def load_manifest():
    if not MANIFEST.exists():
        raise FileNotFoundError(
            f"Audio clips manifest not found: {MANIFEST}\n"
            "Run: python scripts/generate-voiceover.py"
        )
    with open(MANIFEST, encoding="utf-8") as f:
        return json.load(f)


def get_clip_duration(ffmpeg, clip_path):
    """Get duration of an MP3 clip in seconds using ffmpeg -i."""
    import re
    try:
        result = subprocess.run(
            [ffmpeg, "-hide_banner", "-i", clip_path],
            capture_output=True, text=True, timeout=15
        )
        match = re.search(r'Duration:\s*(\d+):(\d+):([\d.]+)', result.stderr)
        if match:
            h, m, s = int(match.group(1)), int(match.group(2)), float(match.group(3))
            return h * 3600 + m * 60 + s
    except Exception:
        pass
    return 5.0  # Fallback estimate


def build_timed_audio(ffmpeg, markers, manifest_items, video_duration, initial_offset_s):
    """
    Build a single audio track with voiceover cues positioned at the correct
    timestamps from the video.

    Returns the path to the generated composite audio file.
    """
    # Build a fast lookup: label → clip file path
    clip_map = {item["label"]: item["file"] for item in manifest_items if item["file"]}

    t0_ms = markers[0]["time"]  # wall-clock ms of first narration cue

    # Calculate cue times relative to the start of the video
    cues = []
    for marker in markers:
        label = marker["label"]
        offset_s = (marker["time"] - t0_ms) / 1000.0 + initial_offset_s
        clip = clip_map.get(label)
        if clip and Path(clip).exists():
            cues.append((label, offset_s, clip))
        else:
            print(f"  ⚠️  No audio clip for: {label} — skipping")

    if not cues:
        raise RuntimeError("No valid audio cues found. Ensure voiceover clips were generated.")

    print(f"\n  Building timed audio track — {len(cues)} cues over {video_duration:.0f}s video\n")
    for label, t, clip in cues:
        print(f"    {t:7.1f}s  {label}")

    # Build ffmpeg command using amix + adelay
    # Each clip: [0:a] adelay=Xms:all=1 [a0]; [1:a] adelay=Yms:all=1 [a1]; ...
    # Then amix inputs=N:duration=longest

    tmp_dir = Path(tempfile.mkdtemp(prefix="demo_audio_"))
    combined_audio = tmp_dir / "combined_voiceover.mp3"

    # Build inputs and filter_complex
    inputs = []
    filter_parts = []
    mix_labels = []

    for i, (label, offset_s, clip) in enumerate(cues):
        inputs += ["-i", clip]
        delay_ms = int(offset_s * 1000)
        filter_parts.append(f"[{i}:a]adelay={delay_ms}|{delay_ms}[a{i}]")
        mix_labels.append(f"[a{i}]")

    n = len(cues)
    filter_complex = ";".join(filter_parts) + f";{''.join(mix_labels)}amix=inputs={n}:duration=longest:normalize=0[out]"

    cmd = [ffmpeg, "-y"] + inputs + [
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-q:a", "2",
        str(combined_audio)
    ]

    print(f"\n  Running ffmpeg audio mixer...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        print(f"  ffmpeg stderr:\n{result.stderr[-2000:]}")
        raise RuntimeError(f"ffmpeg audio mix failed (code {result.returncode})")

    print(f"  ✅ Composite audio: {combined_audio}  ({combined_audio.stat().st_size:,} bytes)")
    return str(combined_audio)


def merge_video_audio(ffmpeg, video_path, audio_path, output_path):
    """Merge video + timed audio into final MP4."""
    print(f"\n  Merging video + audio → {output_path}")

    cmd = [
        ffmpeg, "-y",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",        # High quality (lower = better)
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        str(output_path)
    ]

    print(f"  Running ffmpeg merge (this may take a few minutes)...")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

    if result.returncode != 0:
        print(f"  ffmpeg stderr:\n{result.stderr[-2000:]}")
        raise RuntimeError(f"ffmpeg merge failed (code {result.returncode})")

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"  ✅ Final demo ready: {output_path}  ({size_mb:.1f} MB)")


def main():
    parser = argparse.ArgumentParser(description="Merge Playwright video with TTS voiceover")
    parser.add_argument("--video",  help="Path to .webm recording (auto-detect if omitted)")
    parser.add_argument("--offset", type=float, default=4.0,
                        help="Seconds from video start to first narration cue (default: 4.0)")
    args = parser.parse_args()

    print("\n" + "=" * 60)
    print("  SkyrakSys HRM Demo — Video + Voiceover Merger")
    print("=" * 60)

    ffmpeg = find_ffmpeg()
    print(f"\n  ffmpeg: {ffmpeg}")

    # 1. Find video
    video_path = args.video if args.video else find_latest_video()
    duration   = get_video_duration(ffmpeg, video_path)
    print(f"  Video duration: {duration:.1f}s  ({duration/60:.1f} min)")

    # 2. Load markers (from Playwright run)
    markers = load_markers()
    print(f"  Narration markers: {len(markers)} cues")

    # 3. Load audio clips manifest
    manifest = load_manifest()
    print(f"  Audio clips in manifest: {len(manifest)}")

    # 4. Build timed audio
    audio_path = build_timed_audio(ffmpeg, markers, manifest, duration, args.offset)

    # 5. Merge
    DEMO_OUT.mkdir(parents=True, exist_ok=True)
    merge_video_audio(ffmpeg, video_path, audio_path, FINAL_MP4)

    print("\n" + "=" * 60)
    print(f"  🎬  DEMO COMPLETE: {FINAL_MP4}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
