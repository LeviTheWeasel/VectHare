#!/bin/bash

# YAKE Server Quick Start Script
# ==============================
# Sets up and starts the YAKE keyword extraction server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"
PYTHON_SCRIPT="$SCRIPT_DIR/yake_server.py"
PORT="${YAKE_PORT:-5555}"

echo "==================================="
echo "YAKE Server Quick Start"
echo "==================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "Found Python $PYTHON_VERSION"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo ""
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Install/upgrade dependencies
echo ""
echo "Installing dependencies..."
pip install --upgrade pip > /dev/null 2>&1
pip install -q -r "$SCRIPT_DIR/requirements.txt"
echo "✓ Dependencies installed"

# Check if server script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo ""
    echo "ERROR: yake_server.py not found at $PYTHON_SCRIPT"
    exit 1
fi

# Start server
echo ""
echo "==================================="
echo "Starting YAKE server on port $PORT"
echo "==================================="
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 "$PYTHON_SCRIPT" --port "$PORT"
