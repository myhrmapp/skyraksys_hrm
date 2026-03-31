import asyncio
import edge_tts

OUT = r"d:\skyraksys_hrm1\skyraksys_hrm_app\demo-output\audio"
VOICE = "en-US-ChristopherNeural"

CLIPS = [
    ("HR_dashboard", "The H-R portal focuses on people operations. The dashboard surfaces leave and headcount metrics relevant to H-R workflows."),
    ("ADMIN_reports", "The Reports module delivers four high-value report types: Attendance Summary, Leave Analysis, Payroll Summary, and a complete Employee Report — all exportable."),
]

async def gen():
    for name, text in CLIPS:
        path = f"{OUT}\\{name}.mp3"
        print(f"Generating {name}...")
        for attempt in range(3):
            try:
                await asyncio.wait_for(
                    edge_tts.Communicate(text, VOICE).save(path),
                    timeout=30
                )
                import os
                size = os.path.getsize(path)
                print(f"  -> {size:,} bytes")
                break
            except Exception as e:
                print(f"  attempt {attempt+1} failed: {e}")
                await asyncio.sleep(2)
        await asyncio.sleep(1)

asyncio.run(gen())
print("Done.")
