"""
Timing Audit — prints a table of all 39 clips with:
  Cue (start time in video), Window (available time), Clip (actual duration),
  Used (trimmed duration applied in assembly), Status
"""
import json, subprocess, re, os

FFMPEG = r'C:\Users\otyvi\AppData\Local\Programs\Python\Python312\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
AUDIO_DIR = os.path.join(os.path.dirname(__file__), '..', 'demo-output', 'audio')
MARKERS_FILE = os.path.join(os.path.dirname(__file__), '..', 'demo-output', 'video-markers-v2.json')

with open(MARKERS_FILE) as f:
    markers = json.load(f)

t0 = markers[0]['time']
cues = [(m['label'], (m['time'] - t0) / 1000.0) for m in markers]

def get_dur(path):
    r = subprocess.run([FFMPEG, '-i', path], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', r.stderr)
    if m:
        return int(m.group(1))*3600 + int(m.group(2))*60 + float(m.group(3))
    return None

print(f'\n{"#":>3}  {"CLIP ID":<38}  {"CUE":>8}  {"WINDOW":>8}  {"CLIP":>8}  {"USED":>8}  {"OVERFLOW":>9}  STATUS')
print('-'*105)

trimmed_count = 0
ok_count = 0
missing_count = 0

for i, (cid, offset) in enumerate(cues):
    window = (cues[i+1][1] - offset) if i+1 < len(cues) else None
    filename = cid.replace('.', '_') + '.mp3'
    path = os.path.join(AUDIO_DIR, filename)
    dur = get_dur(path) if os.path.exists(path) else None

    if dur is None:
        status = '*** MISSING ***'
        missing_count += 1
        used = '-'
        overflow = '-'
        clip_s = 'MISSING'
        win_s = f'{window:.2f}s' if window else 'LAST'
        used_s = '-'
        overflow_s = '-'
    elif window is None:
        status = 'LAST'
        ok_count += 1
        used_s = f'{dur:.2f}s'
        clip_s = f'{dur:.2f}s'
        win_s = 'LAST'
        overflow_s = '-'
    elif dur > window:
        status = 'TRIMMED'
        trimmed_count += 1
        clip_s = f'{dur:.2f}s'
        win_s = f'{window:.2f}s'
        used_s = f'{window:.2f}s'
        overflow_s = f'+{dur - window:.2f}s'
    else:
        status = 'OK'
        ok_count += 1
        clip_s = f'{dur:.2f}s'
        win_s = f'{window:.2f}s'
        used_s = f'{dur:.2f}s'
        overflow_s = f'-{window - dur:.2f}s'  # gap/silence at end of window

    cue_s = f'{offset:.2f}s'
    print(f'{i+1:>3}  {cid:<38}  {cue_s:>8}  {win_s:>8}  {clip_s:>8}  {used_s:>8}  {overflow_s:>9}  {status}')

print('-'*105)
print(f'\nSummary: {ok_count} OK, {trimmed_count} TRIMMED (clipped to window), {missing_count} MISSING')
print(f'Total clips: {len(cues)}\n')
