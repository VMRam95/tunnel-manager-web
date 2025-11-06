"""
Pydantic models for API requests and responses
"""

from typing import Optional, List, Literal
from pydantic import BaseModel
from datetime import datetime


class TunnelInfo(BaseModel):
    """Information about a tracked tunnel"""
    id: str
    env: str
    service: str
    name: str
    status: Literal["running", "stopped"]
    pid: Optional[int] = None
    local_port: str
    remote_port: str
    host: str
    started_at: Optional[str] = None
    uptime_seconds: Optional[int] = None


class OrphanedTunnelInfo(BaseModel):
    """Information about an orphaned tunnel"""
    pid: int
    port: Optional[str] = None
    env: Optional[str] = None
    host: Optional[str] = None


class TunnelListResponse(BaseModel):
    """Response for listing all tunnels"""
    tracked: List[TunnelInfo]
    orphaned: List[OrphanedTunnelInfo]


class StartTunnelRequest(BaseModel):
    """Request to start a tunnel"""
    env: str
    service: str


class StartTunnelResponse(BaseModel):
    """Response after starting a tunnel"""
    success: bool
    tunnel_id: Optional[str] = None
    pid: Optional[int] = None
    message: str


class StopTunnelRequest(BaseModel):
    """Request to stop a tunnel"""
    env: str
    service: str


class StopTunnelResponse(BaseModel):
    """Response after stopping a tunnel"""
    success: bool
    message: str


class StopAllResponse(BaseModel):
    """Response after stopping all tunnels"""
    success: bool
    stopped_count: int
    message: str
