#!/usr/bin/env bash
# ==============================================================================
#  OmniSign AI - Complete Multi-Platform Installer & Environment Provisioner
#  Supported OS: Linux (Ubuntu, Debian, Fedora, Arch, Alpine), macOS, Windows (WSL/Git-Bash)
# ==============================================================================

set -e

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "=============================================================================="
echo "  🚀 OmniSign AI: Automated Environment Installer & Setup Engine"
echo "=============================================================================="
echo -e "${NC}"

# 1. Resolve Script & Project Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo -e "${BLUE}[+] Working Directory:${NC} $SCRIPT_DIR"

# 2. Detect Operating System Architecture
OS_TYPE="unknown"
UNAME_OUT="$(uname -s)"
case "${UNAME_OUT}" in
    Linux*)     OS_TYPE="Linux";;
    Darwin*)    OS_TYPE="macOS";;
    CYGWIN*|MINGW*|MSYS*) OS_TYPE="Windows";;
    *)          OS_TYPE="UNKNOWN:${UNAME_OUT}"
esac

echo -e "${BLUE}[+] Operating System Detected:${NC} ${BOLD}${OS_TYPE}${NC} (${UNAME_OUT})"

# 3. Detect Package Manager on Linux
install_system_pkg() {
    local PKG_NAME="$1"
    if [ "$OS_TYPE" == "Linux" ]; then
        if command -v apt-get &> /dev/null; then
            echo -e "${YELLOW}[!] Installing $PKG_NAME using apt-get...${NC}"
            sudo apt-get update -y && sudo apt-get install -y "$PKG_NAME"
        elif command -v dnf &> /dev/null; then
            echo -e "${YELLOW}[!] Installing $PKG_NAME using dnf...${NC}"
            sudo dnf install -y "$PKG_NAME"
        elif command -v yum &> /dev/null; then
            echo -e "${YELLOW}[!] Installing $PKG_NAME using yum...${NC}"
            sudo yum install -y "$PKG_NAME"
        elif command -v pacman &> /dev/null; then
            echo -e "${YELLOW}[!] Installing $PKG_NAME using pacman...${NC}"
            sudo pacman -Sy --noconfirm "$PKG_NAME"
        elif command -v apk &> /dev/null; then
            echo -e "${YELLOW}[!] Installing $PKG_NAME using apk...${NC}"
            apk add "$PKG_NAME"
        fi
    elif [ "$OS_TYPE" == "macOS" ]; then
        if command -v brew &> /dev/null; then
            echo -e "${YELLOW}[!] Installing $PKG_NAME using Homebrew...${NC}"
            brew install "$PKG_NAME"
        else
            echo -e "${RED}[✗] Homebrew not found. Please install Homebrew or $PKG_NAME manually.${NC}"
        fi
    elif [ "$OS_TYPE" == "Windows" ]; then
        if command -v winget &> /dev/null; then
            echo -e "${YELLOW}[!] Installing $PKG_NAME using winget...${NC}"
            winget install "$PKG_NAME" --silent --accept-package-agreements --accept-source-agreements || true
        elif command -v choco &> /dev/null; then
            choco install -y "$PKG_NAME" || true
        fi
    fi
}

# 4. Check & Provision Python 3
PYTHON_BIN=""
for cmd in python3.11 python3.10 python3.12 python3 python; do
    if command -v "$cmd" &> /dev/null; then
        VER=$("$cmd" -c "import sys; print('.'.join(map(str, sys.version_info[:2])))" 2>/dev/null || echo "0.0")
        MAJOR=$(echo "$VER" | cut -d. -f1)
        MINOR=$(echo "$VER" | cut -d. -f2)
        if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 8 ]; then
            PYTHON_BIN="$cmd"
            break
        fi
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    echo -e "${YELLOW}[!] Compatible Python (3.8+) not found. Attempting automated installation...${NC}"
    if [ "$OS_TYPE" == "Linux" ]; then
        install_system_pkg "python3 python3-pip python3-venv"
    elif [ "$OS_TYPE" == "macOS" ]; then
        install_system_pkg "python@3.10"
    elif [ "$OS_TYPE" == "Windows" ]; then
        install_system_pkg "Python.Python.3.10"
    fi

    # Re-check after install
    for cmd in python3 python; do
        if command -v "$cmd" &> /dev/null; then
            PYTHON_BIN="$cmd"
            break
        fi
    done
fi

if [ -z "$PYTHON_BIN" ]; then
    echo -e "${RED}[✗] Failed to locate Python 3.8+. Please install Python manually.${NC}"
    exit 1
fi

PY_VERSION=$("$PYTHON_BIN" --version)
echo -e "${GREEN}[✓] Python detected:${NC} $PY_VERSION ($PYTHON_BIN)"

# 5. Check Node.js & npm (Optional tooling verification)
if command -v node &> /dev/null; then
    NODE_VER=$(node -v)
    echo -e "${GREEN}[✓] Node.js detected:${NC} $NODE_VER"
else
    echo -e "${YELLOW}[-] Node.js not detected (optional for core runtime, skipping).${NC}"
fi

# 6. Setup Python Virtual Environment (.venv)
VENV_DIR="$SCRIPT_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${CYAN}[+] Creating isolated Python virtual environment in .venv...${NC}"
    "$PYTHON_BIN" -m venv "$VENV_DIR" || {
        echo -e "${YELLOW}[!] Standard venv module missing. Installing python3-venv...${NC}"
        install_system_pkg "python3-venv"
        "$PYTHON_BIN" -m venv "$VENV_DIR"
    }
fi

# Activate virtual environment
if [ -f "$VENV_DIR/bin/activate" ]; then
    source "$VENV_DIR/bin/activate"
    VENV_PYTHON="$VENV_DIR/bin/python"
    VENV_PIP="$VENV_DIR/bin/pip"
elif [ -f "$VENV_DIR/Scripts/activate" ]; then
    source "$VENV_DIR/Scripts/activate"
    VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
    VENV_PIP="$VENV_DIR/Scripts/pip.exe"
else
    VENV_PYTHON="$PYTHON_BIN"
    VENV_PIP="pip3"
fi

echo -e "${GREEN}[✓] Virtual environment activated.${NC}"

# 7. Upgrade pip & Install requirements.txt
echo -e "${CYAN}[+] Upgrading pip and package installers...${NC}"
"$VENV_PYTHON" -m pip install --upgrade pip setuptools wheel --quiet

if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
    echo -e "${CYAN}[+] Installing dependencies from requirements.txt...${NC}"
    "$VENV_PIP" install -r "$SCRIPT_DIR/requirements.txt"
    echo -e "${GREEN}[✓] All Python dependencies installed successfully!${NC}"
else
    echo -e "${YELLOW}[!] requirements.txt not found. Installing base stack (fastapi, uvicorn, gtts)...${NC}"
    "$VENV_PIP" install fastapi "uvicorn[standard]" pydantic gtts requests pytest pyinstaller
fi

# 8. Standalone Binary/EXE Build Option
BUILD_EXE=false
for arg in "$@"; do
    if [ "$arg" == "--build-exe" ] || [ "$arg" == "-b" ]; then
        BUILD_EXE=true
    fi
done

if [ "$BUILD_EXE" = true ]; then
    echo -e "${CYAN}[+] Building standalone distribution bundle with PyInstaller...${NC}"
    "$VENV_PYTHON" -m PyInstaller \
        --name="OmniSignAI" \
        --noconfirm \
        --onedir \
        --windowed \
        --add-data="assets:assets" \
        --add-data="static:static" \
        --add-data="server:server" \
        run.py
    echo -e "${GREEN}[✓] Standalone build complete in dist/OmniSignAI!${NC}"
fi

# 9. Verify System Health with Test Suite
if [ -f "$SCRIPT_DIR/test_app.py" ]; then
    echo -e "${CYAN}[+] Running self-test suite verification...${NC}"
    "$VENV_PYTHON" "$SCRIPT_DIR/test_app.py"
fi

# 10. Launch OmniSign AI
echo ""
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✨ Installation and Provisioning Completed Successfully! ✨${NC}"
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo -e "  • Web Interface:  ${CYAN}${BOLD}http://localhost:8000${NC}"
echo -e "  • API Docs:       ${CYAN}${BOLD}http://localhost:8000/docs${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""

echo -e "${CYAN}[+] Launching OmniSign AI Application Server...${NC}"
exec "$VENV_PYTHON" "$SCRIPT_DIR/run.py"
