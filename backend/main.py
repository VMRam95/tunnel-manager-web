"""
FastAPI application for Tunnel Manager Web
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

from .tunnel_manager import TunnelManager
from .models import (
    TunnelListResponse,
    StartTunnelRequest,
    StartTunnelResponse,
    StopTunnelRequest,
    StopTunnelResponse,
    StopAllResponse
)
from .config import SERVER_HOST, SERVER_PORT

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Tunnel Manager Web",
    description="Web interface for managing AWS SSM tunnels",
    version="0.1.0"
)

# Get project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Mount static files
app.mount("/assets", StaticFiles(directory=PROJECT_ROOT / "frontend" / "assets"), name="assets")

# Initialize tunnel manager
tunnel_manager = TunnelManager()


@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """Serve the frontend HTML"""
    html_path = PROJECT_ROOT / "frontend" / "index.html"
    if not html_path.exists():
        raise HTTPException(status_code=404, detail="Frontend not found")

    with open(html_path, 'r') as f:
        return HTMLResponse(content=f.read())


@app.get("/api/tunnels", response_model=TunnelListResponse)
async def list_tunnels():
    """Get all tunnels (tracked + orphaned)"""
    try:
        tunnels_data = tunnel_manager.get_all_tunnels()
        logger.info(f"Listed tunnels: {len(tunnels_data['tracked'])} tracked, {len(tunnels_data['orphaned'])} orphaned")
        return TunnelListResponse(**tunnels_data)
    except Exception as e:
        logger.error(f"Error listing tunnels: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tunnels/start", response_model=StartTunnelResponse)
async def start_tunnel(request: StartTunnelRequest):
    """Start a tunnel"""
    try:
        logger.info(f"Starting tunnel: {request.env}/{request.service}")
        success, message, pid = tunnel_manager.start_tunnel(request.env, request.service)

        if success:
            tunnel_id = f"{request.env}_{request.service}"
            logger.info(f"Tunnel started successfully: {tunnel_id} (PID: {pid})")
            return StartTunnelResponse(
                success=True,
                tunnel_id=tunnel_id,
                pid=pid,
                message=message
            )
        else:
            logger.warning(f"Failed to start tunnel: {message}")
            return StartTunnelResponse(
                success=False,
                message=message
            )
    except Exception as e:
        logger.error(f"Error starting tunnel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tunnels/stop", response_model=StopTunnelResponse)
async def stop_tunnel(request: StopTunnelRequest):
    """Stop a tunnel"""
    try:
        logger.info(f"Stopping tunnel: {request.env}/{request.service}")
        success, message = tunnel_manager.stop_tunnel(request.env, request.service)

        if success:
            logger.info(f"Tunnel stopped successfully: {request.env}/{request.service}")
        else:
            logger.warning(f"Failed to stop tunnel: {message}")

        return StopTunnelResponse(
            success=success,
            message=message
        )
    except Exception as e:
        logger.error(f"Error stopping tunnel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tunnels/stop-all", response_model=StopAllResponse)
async def stop_all_tunnels():
    """Stop all tunnels"""
    try:
        logger.info("Stopping all tunnels")
        stopped_count, message = tunnel_manager.stop_all_tunnels()

        logger.info(f"Stopped {stopped_count} tunnel(s)")

        return StopAllResponse(
            success=True,
            stopped_count=stopped_count,
            message=message or f"Stopped {stopped_count} tunnel(s)"
        )
    except Exception as e:
        logger.error(f"Error stopping all tunnels: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "tunnel-manager-web"}


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Tunnel Manager Web on {SERVER_HOST}:{SERVER_PORT}")
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)
