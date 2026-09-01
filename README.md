# 🤟 OmniSign AI - Two-Way Sign Language & Voice Translator

An intelligent, real-time **Two-Way Sign Language and Voice/Speech Communication System** powered by OpenCV, TensorFlow, MediaPipe, and FastAPI.

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-black?style=flat&logo=github)](https://github.com/bn08495-tech/omnisign-ai)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live_Demo-black?style=flat&logo=vercel)](https://omnisign-ai.vercel.app)

* 🌐 **Live Web Application**: [https://omnisign-ai.vercel.app](https://omnisign-ai.vercel.app)
* 🐙 **GitHub Repository**: [https://github.com/bn08495-tech/omnisign-ai](https://github.com/bn08495-tech/omnisign-ai)
* 📚 **API Documentation**: [https://omnisign-ai.vercel.app/docs](https://omnisign-ai.vercel.app/docs)

---

## 🌟 Key Features

1. **🎙️ Voice & Text to Sign Language (V2S)**:
   - Live speech recognition via microphone + phrase text box.
   - NLP tokenizer supporting multi-word phrases (e.g. *heavy rain*, *clear skies*, *next week*) and 120+ animated signs.
   - Fallback ASL fingerspelling for any unknown names or words.
   - Interactive sign player with speed controls (0.5x, 1.0x, 1.5x, 2.0x), timeline scrubbing, step-through, and loop.

2. **🖐️ Sign Language to Voice & Speech (S2V)**:
   - Real-time webcam computer vision with 21-point hand landmark mesh tracking.
   - AI gesture & alphabet classifier supporting ASL alphabet (A-Z) and common conversational signs (*Hello, Yes, No, Peace, OK, I Love You, Fist, Pointing*).
   - Real-time sentence builder with auto-append hold timer and predictive word suggestions.
   - Built-in Text-to-Speech (TTS) synthesizer that voices out the accumulated sentence.

3. **🔄 Dual-Party Live Conversation Bridge**:
   - Split-screen communication room designed for seamless interaction between Hearing and Deaf/Hard-of-Hearing participants.
   - Simultaneous translation: Voice becomes animated sign playback, and signed gestures become audible speech in real-time.
   - Downloadable conversation transcript.

4. **📚 Interactive Sign Dictionary & Practice Studio**:
   - Filterable dictionary explorer of 120+ animated words and 26 fingerspelling alphabets.
   - Interactive Camera Practice Game: Gives sign prompts, monitors user gestures in front of the camera, and tracks accuracy score and streak!

---

## 🚀 Quick Start & Automated Installation

### 1. Automated One-Click Installer
Run the cross-platform installation script (automatically detects OS, provisions Python/Node dependencies, sets up `.venv`, and starts the server):

**On Linux / macOS / WSL / Git-Bash:**
```bash
chmod +x install.sh
./install.sh
```

**To build a standalone executable bundle:**
```bash
./install.sh --build-exe
```

**On Native Windows (CMD / PowerShell):**
```cmd
install.bat
```

### 2. Manual Start
```bash
python3 run.py
```
Or start via Uvicorn directly:
```bash
uvicorn server.app:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Open in Browser
Visit **[http://localhost:8000](http://localhost:8000)** in Google Chrome, Edge, or Firefox.  
Interactive API Documentation is available at **[http://localhost:8000/docs](http://localhost:8000/docs)**.

---

## 📂 Project Structure

```
├── assets/
│   ├── alphabet/            # 26 ASL Fingerspelling animated GIFs (A-Z)
│   └── words/               # 120+ High-quality animated signs (.webp)
├── server/
│   ├── app.py               # FastAPI backend (Translation, Dictionary, TTS)
│   └── dataset_index.json   # Categorized and indexed vocabulary catalog
├── static/
│   ├── index.html           # Single Page Application
│   ├── style.css            # Dark glassmorphism design system
│   └── app.js               # MediaPipe vision, Web Speech, & sequencer engine
├── run.py                   # One-click startup script
└── README.md
```

---

## 👥 The Creators & Engineering Team

1. **Stotra Gandhi** — *Team Lead & Logic Builder*
   - Core translation algorithms, speech phonetic tokenization heuristics, word-level greedy asset matching, and bidirectional telepresence synchronization.
2. **Dhruvesh Shah** — *Designer & Head of UI/UX*
   - Minimalist monochrome & glassmorphism visual design system, accessibility (a11y) standards, and user interaction journeys.
3. **Virang Shah** — *CI/CD Lead*
   - Continuous integration pipelines, automated test suites, build automation, PWA caching, and deployment reliability.
4. **Vihaan Gupta** — *Asset Gatherer & Asset Builder*
   - Comprehensive sign dataset curation, 1,000+ sign video/image cataloging, alphabet sequencing, and multi-dialect taxonomy.

---

## 🤝 Human Engineering & AI Collaboration

- **Team Contributions**: Problem formulation, dataset gathering & structuring, fine-tuning ML models on custom and open-source sign data with OpenCV and TensorFlow, core phonetic tokenizer, letter fallback logic, and CI/CD pipelines.
- **AI Contributions**: Responsive glassmorphism frontend UI/UX, client-side MediaPipe & Web Speech integration, FastAPI backend scaffolding, service worker caching, and interactive animations.

