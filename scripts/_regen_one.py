import asyncio, edge_tts
from pathlib import Path

async def gen():
    text = ('Alice Brown has requested annual leave for next week. Managers can '
            'review the reason and approve or reject with a single action.')
    out = Path(r'd:\skyraksys_hrm1\skyraksys_hrm_app\demo-output-v3\audio\MANAGER_leave_approval.mp3')
    out.unlink(missing_ok=True)
    comm = edge_tts.Communicate(text=text, voice='en-US-ChristopherNeural')
    await asyncio.wait_for(comm.save(str(out)), timeout=30)
    print(f'Done: {out.stat().st_size:,} bytes')

asyncio.run(gen())
