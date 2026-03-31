import time, os, glob
audio = r'd:\skyraksys_hrm1\skyraksys_hrm_app\demo-output-v3\audio'
print("Waiting for voiceover generation to finish...")
for i in range(60):
    n = len(glob.glob(os.path.join(audio, '*.mp3')))
    print(f'  {n}/39 clips ready', flush=True)
    if n >= 39:
        print('\nALL 39 CLIPS DONE')
        break
    time.sleep(8)
else:
    print(f'\nTIMEOUT — only {n}/39 clips found')
