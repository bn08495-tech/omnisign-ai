# 📜 Project Journey, Prompts & Error Rectification History

> **Note:** For the official competition submission formatted for Design Championship, please see:  
> 👉 **[DESIGN_CHAMPIONSHIP_COMPETITION_REPORT.md](file:///home/computer/Desktop/sign%20lang/DESIGN_CHAMPIONSHIP_COMPETITION_REPORT.md)**  
> 👉 **[TROUBLESHOOTING.md](file:///home/computer/Desktop/sign%20lang/TROUBLESHOOTING.md)**

---

## ⚡ Quick Navigation

1. **[All Prompts Chronologically (Step 0 to Production)](#-all-prompts-chronologically)**
2. **[All Challenges, Errors & How We Rectified Them](#-all-challenges-errors--rectifications)**
3. **[Design Championship Alignment & Rubric](#-design-championship-rubric-alignment)**

---

## 💬 All Prompts Chronologically

| # | Step | Date / Time | Prompt (Verbatim) | Milestone Produced |
| :-: | :-: | :-: | :--- | :--- |
| **1** | Step 0 | 2026-08-25 06:58:17 UTC | `get me` | Project initialization and workspace exploration. |
| **2** | Step 7 | 2026-08-25 06:58:33 UTC | `get me` *(Audio uploaded)* | Project concept input via audio. |
| **3** | Step 15 | 2026-08-25 06:59:00 UTC | `ask question 1 by one` | Structured requirements gathering. |
| **4** | Step 17 | 2026-08-25 07:00:26 UTC | `NAMES 1. Stotra Gandhi(Team Lead) 2. Dhruvesh Shah(Designer) 3.` | Student engineering team roster setup. |
| **5** | Step 17 | 2026-08-25 07:02:41 UTC | `NAMES 1. Stotra Gandhi(Team Leadand Logic Builder) 2. Dhruvesh Shah(Designer and Head of UI/UX) 3. Virang Shah(Asset Gatherer and Asset builder) 4. Vihaan Gupta(CI/CD lead)` | Team roles defined across Logic, UI/UX, Assets, and CI/CD. |
| **6** | Step 19 | 2026-08-25 07:12:49 UTC | `So we have built this project so that there will be an easy communication between the people who can talk normally and the people who can only use hand sign to talk...` | Comprehensive project architecture & logic: Speech recognition -> Keyword asset matcher -> Fingerspelling fallback -> OpenCV & MediaPipe hand tracking -> Two-way Bridge telepresence engine. Human vs AI scope defined. |
| **7** | Step 21 | 2026-08-25 07:14:49 UTC | `instead of the about us make us the complete landing page` | Transitioned static About view into an expansive, interactive product landing page. |
| **8** | Step 39 | 2026-08-27 04:11:46 UTC | *(Implementation Plan Review)* | Approved plan for glassmorphism UI & dictionary explorer. |
| **9** | Step 45 | 2026-08-27 04:34:36 UTC | `continue` | Developed core FastAPI endpoints. |
| **10** | Step 89 | 2026-08-27 04:44:42 UTC | `add animation , transitions, motions(refer to motion.dev ) in lkan ding paeg` | First motion pass: CSS spring curves and glowing vectors. |
| **11** | Step 114 | 2026-09-01 03:51:45 UTC | `interchange the role of vihaan gupta and Virang shah` | Role update: Virang Shah -> CI/CD Lead; Vihaan Gupta -> Asset Gatherer & Builder. |
| **12** | Step 139 | 2026-09-01 03:59:27 UTC | `refer to motion.dev and improve the uand motionb` | Second motion pass: Physics-based easing and tactile active states. |
| **13** | Step 180 | 2026-09-01 04:02:13 UTC | `rendering issue` | Fixed player viewport sizing & container overflow. |
| **14** | Step 214 | 2026-09-01 04:04:30 UTC | `interactive sign is not workng` | Fixed sign animation player controls & scrubber jumps. |
| **15** | Step 264 | 2026-09-01 04:09:32 UTC | `still not done` | Resolved asset paths for `.webp` words and `.gif` alphabets. |
| **16** | Step 302 | 2026-09-01 05:40:53 UTC | `what to improve` | Identified missing PWA caching, contrast, and mobile polish. |
| **17** | Step 305 | 2026-09-01 05:41:51 UTC | `do all` | Implemented Service Worker caching & PWA manifest. |
| **18** | Step 311 | 2026-09-01 06:26:46 UTC | `ADD MOTINON, ANIMATION, FAMER MOTIONS, TRANSITIONS, ETC` | Framer Motion-inspired CSS animation overhaul. |
| **19** | Step 368 | 2026-09-01 06:30:07 UTC | `YOU REMOVEDTHE LANDINGPAGE` | **Immediate Fix:** Recovered accidentally omitted landing page markup and integrated into main navigation. |
| **20** | Step 396 | 2026-09-01 06:31:46 UTC | `ADD MOTION LIKE FADE IN , FADE OUT, SLIDE , ETC` | Added keyframes for fade, slide, and pulse. |
| **21** | Step 414 | 2026-09-01 06:34:21 UTC | `in the landing page add Hero Section Fade-Up Text Reveal... Staggered Children... Interactive CTA Buttons... Scroll-Triggered Reveals... Parallax Depth... Smooth Layout Reordering... Sticky Header Shrink... Respect Reduced Motion` | Comprehensive Framer-Motion design system specification implemented. |
| **22** | Step 448 | 2026-09-01 06:38:14 UTC | *(Framer Motion specification on Overview Page)* | Synchronized overview section with hero reveal cascades. |
| **23** | Step 483 | 2026-09-01 06:41:58 UTC | `a compelte install.sh that check for the os,` | Engineered cross-platform `install.sh` and `install.bat` automated installer. |
| **24** | Step 509 | 2026-09-01 06:43:56 UTC | `deploy it to github using gh and deplot it to vercel` | Git repo initialized, pushed to GitHub, deployed to Vercel. |
| **25** | Step 583 | 2026-09-01 06:45:01 UTC | `create Project Documentation (PDF)...` | Programmed `generate_documentation_pdf.py` using ReportLab for academic PDF export. |
| **26** | Step 601 | 2026-09-01 06:49:45 UTC | `the settings is not working` | Investigated settings modal click handler. |
| **27** | Step 650 | 2026-09-01 06:53:04 UTC | `the setting icon as well as the eye icoon is not working` | Fixed modal z-index blocking and unattached IDs. |
| **28** | Step 713 | 2026-09-01 06:57:45 UTC | `error is still there` | Debugged modal script execution order. |
| **29** | Step 765 | 2026-09-01 07:01:10 UTC | `still not` | Isolated SVG DOM rendering race condition. |
| **30** | Step 841 | 2026-09-01 07:03:37 UTC | `@[/home/computer/Desktop/sign lang/server/app.py] debug the errors` | FastAPI backend diagnostics & static mounts verification. |
| **31** | Step 898 | 2026-09-01 07:07:20` | `remove the eye and setting icon and get me an icon for the vercel` | Replaced problematic eye/settings modals with sleek live Vercel deployment badge and direct theme switcher. |
| **32** | Step 942 | 2026-09-01 07:08:37 UTC | `update github repo` | Committed header overhaul to GitHub repository. |
| **33** | Step 952 | 2026-09-02 07:01:05 UTC | `add light mode and custom theme and assure that the rest of the colouur should change accordingly` | Built multi-theme engine (Dark, Light, Cyberpunk, Emerald). |
| **34** | Step 1036 | 2026-09-02 07:04:46 UTC | `that is not working` | Fixed CSS custom property inheritance on `document.documentElement`. |
| **35** | Step 1083 | 2026-09-02 07:07:32 UTC | `still not working` | Fixed video viewport contrast in Light Mode while protecting HUD landmark readability. |
| **36** | Step 1145 | 2026-09-03 03:24:43 UTC | `the camera is not working` | Debugged camera access button event listeners. |
| **37** | Step 1145 | 2026-09-03 03:25:01 UTC | `the camera is not working like it is not getting on` | Debugged Service Worker cache freeze (empty `app.js`), MediaPipe CDN race conditions; added native fallback loop, `[OmniSign Camera]` logging, and cache version bump to `v2.8`. |
| **38** | Step 1251 | 2026-09-11 04:54:31 UTC | `update the md about the errors and hw to fix it and also make me an md file...` | Updated `README.md`, created `TROUBLESHOOTING.md`, and compiled this competition report. |

---

## 🛠️ All Challenges, Errors & Rectifications

### Summary of Rectified Issues:
1. **Asset Mapping & Fingerspelling Fallback:** Created greedy multi-word tokenizer + single word dictionary + automatic A-Z alphabet decomposition.
2. **Accidental Landing Page Loss:** Restored full landing page with Framer Motion / Motion.dev keyframes and accessibility reduced-motion support.
3. **Cross-Platform OS Shell Installer:** Built universal self-healing `install.sh` (Linux/macOS) and `install.bat` (Windows).
4. **Vercel Serverless Function Routing:** Separated API routing from client-side WebAssembly computer vision for < 15MB instant deployments.
5. **Top Navigation Modal Clutter:** Replaced faulty eye/settings popups with live Vercel status pill and instant theme selector.
6. **Multi-Theme Color Contrast:** Engineered semantic token architecture preserving 7:1 HUD contrast in Light and Dark modes.
7. **Camera Initialization & MediaPipe CDN Lag:** Created dual-path camera pipeline with native `getUserMedia` fallback loop and verbose console logging.
8. **PWA Cache Poisoning & Dev Server Port Conflicts:** Terminated orphaned processes, bumped cache to `omnisign-v2.8`, and added auto-purge logic in Service Worker.

---

For the full detailed technical report, see **[DESIGN_CHAMPIONSHIP_COMPETITION_REPORT.md](file:///home/computer/Desktop/sign%20lang/DESIGN_CHAMPIONSHIP_COMPETITION_REPORT.md)**.
