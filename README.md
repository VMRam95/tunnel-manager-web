# 🔌 Tunnel Manager Web

Web interface for managing AWS SSM tunnels across DEV, PRE, and PRO environments.

## Features

- ✅ Visual dashboard for all tunnels
- ✅ One-click start/stop per tunnel
- ✅ Real-time status indicators
- ✅ Automatic uptime tracking
- ✅ Orphaned tunnel detection
- ✅ Stop all tunnels at once
- ✅ Auto-refresh every 5 seconds
- ✅ Responsive design

## Tech Stack

**Backend:**
- FastAPI 0.104+
- Python 3.8+
- Uvicorn (ASGI server)

**Frontend:**
- Alpine.js 3.x (reactive UI)
- TailwindCSS 3.x (styling)
- Pure HTML/JS (no build step)

## Prerequisites

- Python 3.8 or higher
- AWS CLI configured with profiles:
  - `730335355057_AWSDevelopersSSMAccess` (DEV)
  - `869935070242_AWSDevelopersSSMAccess` (PRE)
  - `571600864205_AWSDevelopersSSMAccess` (PRO)
- AWS Session Manager Plugin installed
- Access to EC2 instances in each environment

## Installation

1. Clone or navigate to the repository:
```bash
cd /Users/victor.manuel.ramirez.marcos/Repositories/tunnel-manager-web
```

2. Create virtual environment and install dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. Start the server:
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 5678
```

4. Open browser:
```
http://localhost:5678
```

## Quick Start (Development)

Use the development script:

```bash
./scripts/start-dev.sh
```

This will:
- Create venv if needed
- Install dependencies
- Start server with auto-reload

## Raycast Integration

1. Copy the Raycast script:
```bash
cp scripts/tunnel-manager-web.sh ~/Documents/Raycast-Scripts/
```

2. Open Raycast and search for "Tunnel Manager Web"

3. The script will:
   - Start backend automatically if not running
   - Open browser to http://localhost:5678

## Project Structure

```
tunnel-manager-web/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── tunnel_manager.py    # Core tunnel logic
│   ├── models.py            # Pydantic models
│   └── config.py            # Configuration
├── frontend/
│   ├── index.html           # Main UI
│   └── assets/
│       └── app.js           # Alpine.js logic
├── scripts/
│   ├── start-dev.sh         # Dev startup
│   └── tunnel-manager-web.sh # Raycast script
├── logs/                    # Application logs
├── requirements.txt
├── .gitignore
└── README.md
```

## API Endpoints

### GET /api/tunnels
List all tunnels (tracked + orphaned)

**Response:**
```json
{
  "tracked": [
    {
      "id": "dev_mongo",
      "env": "dev",
      "service": "mongo",
      "name": "MongoDB",
      "status": "running",
      "pid": 12345,
      "local_port": "24017",
      "remote_port": "27017",
      "host": "aws-docdb...",
      "started_at": "2025-11-06T10:50:16",
      "uptime_seconds": 7200
    }
  ],
  "orphaned": [
    {
      "pid": 13352,
      "port": "24017",
      "env": "DEV",
      "host": "aws-docdb..."
    }
  ]
}
```

### POST /api/tunnels/start
Start a tunnel

**Request:**
```json
{
  "env": "dev",
  "service": "mongo"
}
```

**Response:**
```json
{
  "success": true,
  "tunnel_id": "dev_mongo",
  "pid": 12345,
  "message": "Tunnel started successfully..."
}
```

### POST /api/tunnels/stop
Stop a tunnel

**Request:**
```json
{
  "env": "dev",
  "service": "mongo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tunnel stopped (PID: 12345 + children)"
}
```

### POST /api/tunnels/stop-all
Stop all tunnels

**Response:**
```json
{
  "success": true,
  "stopped_count": 5,
  "message": "Stopped 5 tunnel(s)"
}
```

## Configuration

Edit `backend/config.py` to change:
- Server host/port (default: `0.0.0.0:5678`)
- Tunnel configurations
- AWS profiles and regions
- Service ports

## Tunnel Configurations

### DEV (Port Range: 8xxx, 24xxx, 6xxx, 15xxx)
- PostgreSQL: `localhost:8432`
- MongoDB: `localhost:24017`
- Redis: `localhost:6479`
- RabbitMQ: `localhost:15672`

### PRE (Port Range: 8xxx, 24xxx, 6xxx, 15xxx)
- PostgreSQL: `localhost:8532`
- MongoDB: `localhost:24517`
- Redis: `localhost:6579`
- RabbitMQ: `localhost:15572`

### PRO (Port Range: 8xxx, 27xxx, 15xxx)
- PostgreSQL: `localhost:8432`
- MongoDB: `localhost:27027` (⚠️ Different port to avoid DEV conflict)
- RabbitMQ: `localhost:15672`

## Troubleshooting

### Backend won't start
```bash
# Check if port 5678 is in use
lsof -i :5678

# Kill existing process
kill -9 <PID>
```

### Tunnels not appearing
```bash
# Check state file
cat ~/.ssm-tunnels-state.json

# Check for orphaned processes
ps aux | grep session-manager-plugin
```

### AWS credentials issues
```bash
# Verify profiles are configured
aws configure list-profiles

# Test profile access
aws sts get-caller-identity --profile 730335355057_AWSDevelopersSSMAccess
```

## Development

### Adding a new service

1. Edit `backend/config.py` and add to `TUNNEL_CONFIGS`
2. Edit `frontend/assets/app.js` and add to `SERVICES`
3. Update frontend HTML to display the new service

### Running tests

```bash
# Unit tests (when added)
pytest tests/

# Manual testing
./scripts/start-dev.sh
# Open http://localhost:5678
```

## Migration from CLI

The Web UI uses the **same backend code** as the CLI tunnel manager:
- Shares the same state file (`~/.ssm-tunnels-state.json`)
- Compatible with existing tunnels
- Can run alongside CLI version

To migrate:
1. Stop all CLI tunnels: `~/Documents/Scripts/ssm-tunnel-manager.py` → Option 4
2. Start Web UI: `./scripts/start-dev.sh`
3. Manage tunnels via browser

## Future Improvements

- [ ] WebSocket for real-time updates (no polling)
- [ ] Tunnel logs viewer
- [ ] Start All by environment
- [ ] Favorites/presets
- [ ] Health checks and alerts
- [ ] Connection statistics

## License

Internal tool for team use.

## Author

Victor Manuel Ramirez Marcos
