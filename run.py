#!/usr/bin/env python3
"""
OmniSign AI - Two-Way Sign Language & Voice Translator Launcher
Starts the Uvicorn FastAPI server and opens the browser interface.
"""

import os
import sys
import webbrowser
import time
import uvicorn

def main():
    print("=" * 65)
    print("  🚀 Starting OmniSign AI: Two-Way Sign Language & Voice System")
    print("=" * 65)
    print("  • Web UI & API:  http://localhost:8000")
    print("  • Swagger Docs:  http://localhost:8000/docs")
    print("=" * 65)

    # Server directory
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "server"))

    try:
        webbrowser.open("http://localhost:8000")
    except Exception:
        pass

    from app import app
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

if __name__ == "__main__":
    main()
