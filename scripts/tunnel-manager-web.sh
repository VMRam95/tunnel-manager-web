#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Tunnel Manager Web
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🔌
# @raycast.packageName AWS Scripts

# Documentation:
# @raycast.description Open Tunnel Manager Web UI
# @raycast.author Victor

PROJECT_DIR="/Users/victor.manuel.ramirez.marcos/Repositories/tunnel-manager-web"

# Check if backend is running
if ! lsof -i :5678 > /dev/null 2>&1; then
    echo "Starting backend..."
    cd "$PROJECT_DIR"

    # Create venv if doesn't exist
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        source venv/bin/activate
        pip install -q -r requirements.txt
    else
        source venv/bin/activate
    fi

    # Start backend in background
    nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port 5678 \
        > logs/backend.log 2>&1 &

    # Wait for server to start
    sleep 2
fi

# Open browser
open http://localhost:5678

echo "✅ Tunnel Manager Web opened at http://localhost:5678"
