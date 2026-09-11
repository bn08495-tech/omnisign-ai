# 🛠️ OmniSign AI — Troubleshooting & Error Resolution Guide

This guide provides comprehensive, step-by-step diagnostic and remediation instructions for all errors, edge cases, and technical issues encountered during development, local execution, and production deployment of **OmniSign AI**.

---

## 📋 Quick Diagnostic Matrix

| Symptom / Error Message | Root Cause | Quick Fix Command / Action |
| :--- | :--- | :--- |
| **"Camera access failed" / Black Video Screen** | Browser permission blocked, non-HTTPS origin, or camera in use by another app | Grant camera permissions in browser URL bar; use HTTPS / localhost; close conflicting apps |
| **MediaPipe Camera Constructor Freezing** | `@mediapipe/camera_utils` CDN latency or blocked script loading | Built-in fallback to native `navigator.mediaDevices.getUserMedia` handles this automatically in v2.8+ |
| **`ConnectionRefusedError: [Errno 111]`** | FastAPI backend server is not running on port 8000 | Run `python3 run.py` or `./install.sh` |
| **`Address already in use: 8000`** | Previous server instance was not terminated cleanly | Run `lsof -ti:8000 \| xargs kill -9` |
| **`ModuleNotFoundError: No module named 'requests'` / `'fastapi'`** | Running with system Python instead of the isolated virtual environment | Activate `.venv`: `source .venv/bin/activate` or use `./install.sh` |
| **Blank White Screen or Stale UI after Updates** | Service Worker (`sw.js`) or browser aggressively caching old JavaScript | Force hard reload (`Ctrl + Shift + R` or `Cmd + Shift + R`), unregister SW in DevTools |
| **Empty `app.js` (0 Bytes / MD5 `d41d8cd9...`)** | Dev server interrupted during file write or race condition | Restart dev server: `python3 run.py` |
| **Microphone Recognition Error / "network" / "not-allowed"** | Web Speech API requires HTTPS or localhost, or mic permission denied | Use Google Chrome/Edge on HTTPS; allow mic permission |
| **Light Theme Text Low Contrast on Camera Feed** | CSS variable inheritance on video canvas overlays | Applied high-contrast darkened HUD pill backdrop in v2.8+ |
| **Vercel 404 on Static Assets (`/static/...`)** | Serverless function route shadowing static directory | Check `vercel.json` static rewrites and route configuration |

---

## 🔍 Detailed Error Analyses & Remediation Procedures

### 1. 📷 Camera Not Turning On / "Camera access failed"

#### Symptoms:
- Clicking **"Connect Camera"** or **"Start Camera"** on the *Sign to Voice* tab does nothing.
- Status displays: `"Camera access failed: ..."` or video viewport remains dark with a loading spinner.
- Browser console (`F12` → `Console`) shows `NotAllowedError: Permission denied` or `NotFoundError: Requested device not found`.

#### Root Causes:
1. **Permission Denied:** The browser blocked video capture permissions for the current origin.
2. **Insecure Context (HTTP):** Web browsers strictly disable `navigator.mediaDevices.getUserMedia` on insecure HTTP domains (it only runs on `localhost`, `127.0.0.1`, or valid `https://` URLs like Vercel).
3. **Hardware Lock:** Another application (Zoom, Teams, OBS, or another browser tab) is holding an exclusive hardware lock on the webcam.
4. **MediaPipe CDN Script Failure:** The external `@mediapipe/camera_utils` or `@mediapipe/hands` script took too long to initialize.

#### Step-by-Step Fix:
1. **Verify HTTPS / Localhost:**
   - Always access the app via **`http://localhost:8000`** or **`https://omnisign-ai.vercel.app`**. Never use raw LAN IPs (e.g. `http://192.168.x.x:8000`) without setting up SSL certificates.
2. **Reset Site Permissions:**
   - In Google Chrome / Brave / Edge: Click the **Padlock / Tune icon** to the left of the URL bar.
   - Set **Camera** to **"Allow"**.
   - Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (macOS) to reload.
3. **Free Up Camera Hardware:**
   - On Linux:
     ```bash
     sudo fuser -v /dev/video*
     # Terminate any conflicting process holding video devices
     ```
   - On Windows/macOS: Close OBS Studio, Teams, Discord, and other open camera browser tabs.
4. **Inspect Console Logs:**
   - Open Developer Tools (`F12`) → **Console**.
   - Look for entries starting with `[OmniSign Camera]`. Version 2.8+ logs every phase:
     - `[OmniSign Camera] Initializing camera...`
     - `[OmniSign Camera] Stream acquired, assigning to video element...`
     - `[OmniSign Camera] Video playing: 640 x 480`
     - `[OmniSign Camera] MediaPipe Camera initialized successfully.` (or `Fallback loop started`).

---

### 2. ⚡ Service Worker Cache Poisoning & Stale UI

#### Symptoms:
- After making code changes to `static/app.js` or `static/style.css`, the browser still shows the previous version.
- JavaScript console errors indicate functions or variables are undefined despite being present in the source file.
- Inspecting network requests shows files served `(from service worker)`.

#### Root Causes:
- The Progressive Web App (PWA) uses a Service Worker (`sw.js`) that caches core assets.
- If the cache version name (e.g., `CACHE_NAME = 'omnisign-v2.8'`) is not updated, the browser serves outdated cached assets indefinitely.

#### Step-by-Step Fix:
1. **Immediate Browser Force-Bypass:**
   - Press `Ctrl + F5` or `Ctrl + Shift + R`.
   - Open DevTools (`F12`) → **Application** tab → **Service Workers** → Click **"Unregister"** and check **"Update on reload"**.
   - Under **Storage**, click **"Clear site data"**.
2. **Development Version Bumping:**
   - Whenever updating client code, increment the version query param in `static/index.html`:
     ```html
     <link rel="stylesheet" href="/static/style.css?v=2.8">
     <script src="/static/app.js?v=2.8"></script>
     ```
   - And update the cache key in `static/sw.js`:
     ```javascript
     const CACHE_NAME = 'omnisign-v2.8';
     ```

---

### 3. 🐍 Python Environment & Dependency Errors

#### Symptoms:
```text
ModuleNotFoundError: No module named 'fastapi'
ModuleNotFoundError: No module named 'uvicorn'
ModuleNotFoundError: No module named 'requests'
```

#### Root Causes:
- Python commands are executing against global system Python rather than the project's virtual environment (`.venv`), where dependencies are installed.
- On newer Linux systems (Debian 12+, Ubuntu 24.04+), PEP 668 prevents installing packages globally (`externally-managed-environment`).

#### Step-by-Step Fix:
1. **Use the Automated Installer:**
   ```bash
   ./install.sh
   ```
   *The script automatically provisions `.venv`, installs all wheels, and verifies imports.*
2. **Manual Activation:**
   ```bash
   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
3. **Execute using virtual environment Python directly:**
   ```bash
   ./.venv/bin/python run.py
   ```

---

### 4. 🚪 Port 8000 Conflict (`Address already in use`)

#### Symptoms:
```text
ERROR:    [Errno 98] error while attempting to bind on address ('0.0.0.0', 8000): address already in use
```

#### Root Causes:
- A previous background instance of Uvicorn or another web server is already bound to port 8000.

#### Step-by-Step Fix:
1. **Identify and Terminate Conflicting Process:**
   ```bash
   # Find process listening on port 8000
   lsof -ti:8000
   
   # Kill the process
   kill -9 $(lsof -ti:8000)
   ```
2. **Alternative: Run on Custom Port:**
   If port 8000 is reserved for another service, start OmniSign on port 8080 or 5000:
   ```bash
   uvicorn server.app:app --host 0.0.0.0 --port 8080 --reload
   ```

---

### 5. 🎙️ Microphone & Speech Recognition Failures

#### Symptoms:
- Clicking the microphone button does not transcribe spoken words.
- Status indicates: `"Speech recognition error: not-allowed"` or `"network"`.

#### Root Causes:
1. **Browser Compatibility:** Web Speech API (`webkitSpeechRecognition`) is natively supported in Chromium-based browsers (Google Chrome, Microsoft Edge, Brave) and Safari. Firefox does not implement the Speech Recognition interface by default.
2. **Origin Security:** Browser security policies reject microphone access over plain HTTP when accessed over an external IP.
3. **Microphone Permissions:** Microphone device access is blocked in site settings.

#### Step-by-Step Fix:
1. **Recommended Browser:** Use **Google Chrome** or **Microsoft Edge** for voice recognition.
2. **Check Fallback:** If speech recognition is unavailable in your browser, use the built-in **phrase input text box** and click **"Translate to Sign"**; the full sign animation sequencer works identically with direct text input.
3. **Verify Audio Input Device:** Check system sound settings to ensure the default microphone is selected and active.

---

### 6. 🌐 Vercel Serverless Function & Cloud Deployment Errors

#### Symptoms:
- Vercel returns `500: INTERNAL_SERVER_ERROR` or `FUNCTION_INVOCATION_TIMEOUT`.
- API calls return `404 Not Found`.

#### Root Causes:
- FastAPI runs as a serverless ASGI handler via `api/index.py`. Large heavy machine learning model weights (TensorFlow/PyTorch) cannot exceed the Vercel 250MB lambda zip limit.
- Static file routing conflicts with API rewrite routes.

#### Step-by-Step Fix:
1. **Serverless Architecture Decoupling:**
   - In OmniSign AI, the live client-side computer vision runs via **MediaPipe WebAssembly in the browser** (`static/app.js`), while the serverless FastAPI backend handles dictionary queries, multi-word phonetic tokenization, and metadata APIs.
   - This keeps the Vercel function bundle ultra-lean (< 15MB) and eliminates lambda cold starts.
2. **Verify `vercel.json` Routing:**
   Ensure `vercel.json` contains proper rewrites:
   ```json
   {
     "builds": [{ "src": "api/index.py", "use": "@vercel/python" }],
     "routes": [
       { "src": "/api/(.*)", "dest": "api/index.py" },
       { "src": "/static/(.*)", "dest": "/static/$1" },
       { "src": "/assets/(.*)", "dest": "/assets/$1" },
       { "src": "/(.*)", "dest": "/static/index.html" }
     ]
   }
   ```
3. **Check Production Deployment Status:**
   ```bash
   vercel --prod --yes
   ```

---

### 7. 🎨 Theme Switching & Visual Contrast Issues

#### Symptoms:
- Toggling between Dark, Light, Cyberpunk, or Emerald themes leaves some text unreadable or camera overlays washed out.

#### Root Causes:
- Hardcoded CSS hex values rather than semantic design tokens.
- Insufficient text-to-background contrast on semi-transparent HUD components.

#### Step-by-Step Fix:
- In `static/style.css`, all component colors are bound to CSS variables (`var(--bg-primary)`, `var(--text-primary)`, `var(--accent-glow)`).
- The camera HUD specifically enforces a permanent semi-opaque dark backing (`background: rgba(10, 15, 26, 0.85); backdrop-filter: blur(8px);`) to guarantee minimum 7:1 contrast ratio for computer vision telemetry regardless of whether the user selects Light or Dark mode.

---

## 🧪 Automated System Verification

To automatically verify that all backend endpoints, dictionary vocabulary, static assets, and media files are operational, run the built-in test suite:

```bash
# Make sure server is running in background or another terminal:
python3 run.py &

# Run verification suite
.venv/bin/python test_app.py
```

**Expected Output:**
```text
Starting OmniSign AI Verification Suite...
Testing /api/health...
✓ Health check passed.
Testing /api/dictionary...
✓ Dictionary check passed.
Testing /api/translate/text-to-sign...
✓ Translation check passed.
Testing asset loading over HTTP...
✓ All 146 media assets successfully verified (HTTP 200).
Testing static assets serving...
✓ Static frontend files verified.

🎉 ALL TESTS PASSED SUCCESSFULLY!
```
