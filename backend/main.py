"""
FastAPI application for Tunnel Manager Web
"""

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

from .tunnel_manager import TunnelManager
from .k8s_manager import K8sPortForwardManager
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

# Initialize managers
tunnel_manager = TunnelManager()
k8s_manager = K8sPortForwardManager()


@app.get("/assets/app.js")
async def serve_app_js():
    """Serve app.js with no-cache headers"""
    js_path = PROJECT_ROOT / "frontend" / "assets" / "app.js"
    if not js_path.exists():
        raise HTTPException(status_code=404, detail="app.js not found")

    with open(js_path, 'r') as f:
        content = f.read()

    return Response(
        content=content,
        media_type="application/javascript",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.get("/favicon.svg")
async def serve_favicon():
    """Serve the favicon"""
    favicon_path = PROJECT_ROOT / "frontend" / "favicon.svg"
    if not favicon_path.exists():
        raise HTTPException(status_code=404, detail="Favicon not found")
    return FileResponse(favicon_path, media_type="image/svg+xml")


@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """Serve the frontend HTML"""
    html_path = PROJECT_ROOT / "frontend" / "index.html"
    if not html_path.exists():
        raise HTTPException(status_code=404, detail="Frontend not found")

    with open(html_path, 'r') as f:
        return HTMLResponse(content=f.read())


# Mount static files (after specific routes)
app.mount("/assets", StaticFiles(directory=PROJECT_ROOT / "frontend" / "assets"), name="assets")


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


@app.post("/api/shutdown")
async def shutdown():
    """Shutdown the server gracefully"""
    import os
    import signal

    logger.info("Shutdown requested - stopping server")

    # Schedule shutdown after response is sent
    def shutdown_server():
        import time
        time.sleep(0.5)  # Give time for response to be sent
        os.kill(os.getpid(), signal.SIGTERM)

    import threading
    threading.Thread(target=shutdown_server, daemon=True).start()

    return {"success": True, "message": "Server shutting down"}


# ============================================================================
# Kubernetes Port-Forward Endpoints
# ============================================================================

@app.get("/api/k8s/pods")
async def list_k8s_pods():
    """List all pods from configured environments"""
    try:
        pods_by_env = {
            'dev': k8s_manager.list_pods('dev'),
            'pre': k8s_manager.list_pods('pre'),
            'pro': k8s_manager.list_pods('pro')
        }
        return {"pods": pods_by_env}
    except Exception as e:
        logger.error(f"Error listing K8s pods: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/k8s/port-forward/start")
async def start_k8s_port_forward(request: dict):
    """Start a Kubernetes port-forward"""
    try:
        env = request.get('env')
        pod_type = request.get('pod_type')
        pod_name = request.get('pod_name')
        local_port = request.get('local_port')
        remote_port = request.get('remote_port')

        if not all([env, pod_type, pod_name, local_port, remote_port]):
            raise HTTPException(status_code=400, detail="Missing required fields")

        success, message, pid = k8s_manager.start_port_forward(
            env, pod_type, pod_name, local_port, remote_port
        )

        if success:
            logger.info(f"Started K8s port-forward: {env}/{pod_type} on port {local_port}")
            return {
                "success": True,
                "message": message,
                "pid": pid,
                "local_port": local_port
            }
        else:
            raise HTTPException(status_code=400, detail=message)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting K8s port-forward: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/k8s/port-forward/stop")
async def stop_k8s_port_forward(request: dict):
    """Stop a Kubernetes port-forward"""
    try:
        env = request.get('env')
        pod_type = request.get('pod_type')

        if not env or not pod_type:
            raise HTTPException(status_code=400, detail="Missing env or pod_type")

        success, message = k8s_manager.stop_port_forward(env, pod_type)

        if success:
            logger.info(f"Stopped K8s port-forward: {env}/{pod_type}")

        return {
            "success": success,
            "message": message
        }

    except Exception as e:
        logger.error(f"Error stopping K8s port-forward: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/k8s/port-forward/stop-all")
async def stop_all_k8s_port_forwards():
    """Stop all Kubernetes port-forwards"""
    try:
        stopped_count, errors = k8s_manager.stop_all_forwards()

        logger.info(f"Stopped {stopped_count} K8s port-forward(s)")

        return {
            "success": True,
            "stopped_count": stopped_count,
            "errors": errors
        }

    except Exception as e:
        logger.error(f"Error stopping all K8s port-forwards: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/k8s/port-forwards")
async def list_k8s_port_forwards():
    """List all active K8s port-forwards"""
    try:
        forwards = k8s_manager.get_all_forwards()
        return {"forwards": forwards}
    except Exception as e:
        logger.error(f"Error listing K8s port-forwards: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Tunnel Manager Web on {SERVER_HOST}:{SERVER_PORT}")
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)
