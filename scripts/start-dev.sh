#!/bin/bash
# Development startup script for Tunnel Manager Web

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🔌 Starting Tunnel Manager Web..."

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

# Start server
echo "🚀 Starting server on http://localhost:5678"
echo ""
python -m uvicorn backend.main:app --host 0.0.0.0 --port 5678 --reload
