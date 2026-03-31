@echo off
REM ═══════════════════════════════════════════════════════════════
REM  SkyrakSys HRM — Full Demo Recording Pipeline
REM  Runs: seed → voiceover TTS → Playwright HD recording → merge
REM
REM  Prerequisites:
REM    - Backend running on port 5000  (npm run start:backend)
REM    - Frontend running on port 3000 (npm run start:frontend)
REM    - Node.js, Python 3, pip (gtts + pydub installed)
REM
REM  Usage (from repo root):
REM    scripts\run-demo-pipeline.bat
REM ═══════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

echo.
echo ══════════════════════════════════════════════════════════════
echo   SkyrakSys HRM Demo Pipeline
echo ══════════════════════════════════════════════════════════════
echo.

REM ── Step 1: Seed demo data ────────────────────────────────────
echo [1/4] Seeding demo data...
cd /d "%~dp0..\backend"
node scripts/seed-demo-rich.js
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Seed script failed. Is the database running?
    exit /b 1
)
echo.

REM ── Step 2: Generate TTS voiceover clips ─────────────────────
echo [2/4] Generating TTS voiceover audio clips...
cd /d "%~dp0.."
python scripts\generate-voiceover.py
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Voiceover generation failed.
    exit /b 1
)
echo.

REM ── Step 3: Run Playwright HD recording ──────────────────────
echo [3/4] Running Playwright HD recording (this takes ~20-30 min)...
echo       Recording will be saved to: frontend\test-results\
echo.
cd /d "%~dp0..\frontend"
npx playwright test -c playwright-demo-hd.config.js demo-v2
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Playwright test exited with non-zero code.
    echo          Checking if video was recorded anyway...
)
echo.

REM ── Step 4: Merge video + voiceover ──────────────────────────
echo [4/4] Merging video with voiceover...
cd /d "%~dp0.."
python scripts\merge-demo.py
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Video merge failed.
    exit /b 1
)
echo.

REM ── Cleanup seed data ─────────────────────────────────────────
echo [+] Removing demo seed data...
cd /d "%~dp0..\backend"
node scripts/seed-demo-rich.js --purge
echo.

echo ══════════════════════════════════════════════════════════════
echo   Demo video ready: demo-output\SkyrakSys_HRM_Demo_v2.mp4
echo ══════════════════════════════════════════════════════════════
echo.

pause
