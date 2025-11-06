"""
Tunnel Manager - Core logic adapted from CLI version
Manages AWS SSM tunnels with improved process management
"""

import subprocess
import json
import os
import signal
import re
import time
import socket
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from .config import STATE_FILE, TUNNEL_CONFIGS


class TunnelState:
    """Manages tunnel state persistence"""

    def __init__(self):
        self.state = self.load_state()

    def load_state(self) -> Dict:
        """Load tunnel state from file"""
        if STATE_FILE.exists():
            try:
                with open(STATE_FILE, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def save_state(self):
        """Save tunnel state to file"""
        with open(STATE_FILE, 'w') as f:
            json.dump(self.state, f, indent=2)

    def add_tunnel(self, env: str, service: str, pid: int, local_port: str):
        """Add a tunnel to state"""
        key = f"{env}_{service}"
        self.state[key] = {
            "env": env,
            "service": service,
            "pid": pid,
            "local_port": local_port,
            "started_at": datetime.now().isoformat()
        }
        self.save_state()

    def remove_tunnel(self, env: str, service: str):
        """Remove a tunnel from state"""
        key = f"{env}_{service}"
        if key in self.state:
            del self.state[key]
            self.save_state()

    def get_tunnel(self, env: str, service: str) -> Optional[Dict]:
        """Get tunnel info"""
        key = f"{env}_{service}"
        return self.state.get(key)

    def get_all_tunnels(self) -> Dict:
        """Get all tunnels"""
        return self.state

    def is_tunnel_active(self, env: str, service: str) -> bool:
        """Check if tunnel is active and PID exists"""
        tunnel = self.get_tunnel(env, service)
        if not tunnel:
            return False

        pid = tunnel.get("pid")
        if not pid:
            return False

        # Check if process exists
        try:
            os.kill(pid, 0)
            return True
        except (OSError, ProcessLookupError):
            # Process doesn't exist, remove from state
            self.remove_tunnel(env, service)
            return False


class TunnelManager:
    """Manages SSM tunnels"""

    def __init__(self):
        self.state = TunnelState()

    def get_running_instance(self, profile: str, region: str, instance_tag: str) -> Optional[str]:
        """Get running EC2 instance ID"""
        command = [
            "aws", "ec2", "describe-instances",
            "--filters", f"Name=instance-state-name,Values=running", f"Name=tag:Name,Values={instance_tag}",
            "--query", "Reservations[].Instances[].InstanceId",
            "--output", "json",
            "--profile", profile,
            "--region", region
        ]

        try:
            output = subprocess.check_output(command, text=True)
            instance_ids = json.loads(output)

            # Flatten nested lists
            if instance_ids and isinstance(instance_ids[0], list):
                flattened = [i for sublist in instance_ids for i in sublist]
            else:
                flattened = instance_ids

            return flattened[0] if flattened else None
        except Exception as e:
            print(f"Error getting instance: {e}")
            return None

    def start_tunnel(self, env: str, service: str) -> Tuple[bool, str, Optional[int]]:
        """
        Start an SSM tunnel
        Returns: (success, message, pid)
        """
        # Check if already running
        if self.state.is_tunnel_active(env, service):
            return False, f"Tunnel already active for {env.upper()} {service}", None

        # Get configuration
        env_config = TUNNEL_CONFIGS.get(env)
        if not env_config:
            return False, f"Invalid environment: {env}", None

        service_config = env_config["services"].get(service)
        if not service_config:
            return False, f"Invalid service: {service}", None

        # Get EC2 instance
        instance_id = self.get_running_instance(
            env_config["profile"],
            env_config["region"],
            env_config["instance_tag"]
        )

        if not instance_id:
            return False, f"No running instance found for {env.upper()}", None

        # Build SSM command
        parameters = json.dumps({
            "portNumber": [service_config["remote_port"]],
            "localPortNumber": [service_config["local_port"]],
            "host": [service_config["host"]]
        })

        command = [
            "aws", "ssm", "start-session",
            "--target", instance_id,
            "--document-name", "AWS-StartPortForwardingSessionToRemoteHost",
            "--parameters", parameters,
            "--profile", env_config["profile"],
            "--region", env_config["region"]
        ]

        # Start tunnel in background
        log_file = tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.log')
        err_file = tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.log')

        try:
            process = subprocess.Popen(
                command,
                stdout=log_file,
                stderr=err_file,
                start_new_session=True
            )

            # Wait for tunnel to establish
            time.sleep(3)

            # Check if process is still alive
            poll_result = process.poll()
            if poll_result is not None:
                # Process died
                err_file.seek(0)
                error_output = err_file.read()
                log_file.seek(0)
                log_output = log_file.read()

                # Cleanup temp files
                try:
                    os.unlink(log_file.name)
                    os.unlink(err_file.name)
                except:
                    pass

                error_msg = f"Tunnel process died immediately (exit code: {poll_result})"
                if error_output:
                    error_msg += f"\nError: {error_output[:500]}"
                if log_output:
                    error_msg += f"\nLog: {log_output[:500]}"

                return False, error_msg, None

            # Check if port is listening
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            port_open = sock.connect_ex(('127.0.0.1', int(service_config["local_port"]))) == 0
            sock.close()

            # Save tunnel state
            self.state.add_tunnel(env, service, process.pid, service_config["local_port"])

            # Cleanup temp files
            try:
                os.unlink(log_file.name)
                os.unlink(err_file.name)
            except:
                pass

            success_msg = f"Tunnel started successfully! PID: {process.pid}, Port: {service_config['local_port']}"
            if not port_open:
                success_msg += " (Port not yet listening, may take a moment)"

            return True, success_msg, process.pid

        except Exception as e:
            # Cleanup temp files
            try:
                os.unlink(log_file.name)
                os.unlink(err_file.name)
            except:
                pass

            return False, f"Error starting tunnel: {e}", None

    def stop_tunnel(self, env: str, service: str) -> Tuple[bool, str]:
        """
        Stop an SSM tunnel
        Returns: (success, message)
        """
        tunnel = self.state.get_tunnel(env, service)

        if not tunnel:
            return False, f"No tunnel found for {env.upper()} {service}"

        pid = tunnel.get("pid")

        try:
            # Kill the process group (parent + children)
            try:
                os.killpg(os.getpgid(pid), signal.SIGTERM)
                msg = f"Tunnel stopped (PID: {pid} + children)"
            except (OSError, ProcessLookupError):
                # Fallback: try killing just the PID
                os.kill(pid, signal.SIGTERM)
                msg = f"Tunnel stopped (PID: {pid})"

            # Remove from state
            self.state.remove_tunnel(env, service)
            return True, msg

        except (OSError, ProcessLookupError):
            self.state.remove_tunnel(env, service)
            return False, f"Process {pid} not found (already stopped?)"

    def find_orphaned_tunnels(self) -> List[int]:
        """Find orphaned session-manager-plugin processes not tracked in state"""
        orphaned_pids = []

        try:
            # Find all session-manager-plugin processes with their parent PIDs
            result = subprocess.run(
                ["ps", "-eo", "pid,ppid,command"],
                capture_output=True,
                text=True,
                check=True
            )

            # Get all tracked parent PIDs
            tracked_pids = set(
                tunnel.get("pid")
                for tunnel in self.state.get_all_tunnels().values()
                if tunnel.get("pid")
            )

            for line in result.stdout.split('\n'):
                if 'session-manager-plugin' in line and 'grep' not in line:
                    parts = line.split(None, 2)
                    if len(parts) >= 2:
                        try:
                            pid = int(parts[0])
                            ppid = int(parts[1])

                            # If parent is NOT tracked, this IS orphaned
                            if ppid not in tracked_pids:
                                orphaned_pids.append(pid)
                        except (ValueError, IndexError):
                            continue

        except Exception as e:
            print(f"Error finding orphaned processes: {e}")

        return orphaned_pids

    def get_orphaned_tunnel_info(self, pid: int) -> Optional[Dict]:
        """Extract tunnel information from orphaned process"""
        try:
            result = subprocess.run(
                ["ps", "-p", str(pid), "-o", "command="],
                capture_output=True,
                text=True,
                check=True
            )

            cmd = result.stdout.strip()
            if 'localPortNumber' in cmd:
                # Extract port from command
                port_match = re.search(r'"localPortNumber":\s*\["(\d+)"\]', cmd)
                host_match = re.search(r'"host":\s*\["([^"]+)"\]', cmd)

                if port_match:
                    port = port_match.group(1)
                    host = host_match.group(1) if host_match else "unknown"

                    # Identify environment from host
                    env = "UNKNOWN"
                    if "dev" in host.lower():
                        env = "DEV"
                    elif "pre" in host.lower():
                        env = "PRE"
                    elif "pro" in host.lower():
                        env = "PRO"

                    return {
                        "pid": pid,
                        "port": port,
                        "host": host,
                        "env": env
                    }
        except Exception:
            pass

        return None

    def get_all_tunnels(self) -> Dict:
        """
        Get all tunnels (tracked + orphaned)
        Returns: {"tracked": [...], "orphaned": [...]}
        """
        tracked = []
        tracked_tunnels = self.state.get_all_tunnels()

        # Process tracked tunnels
        for key, tunnel in tracked_tunnels.items():
            if self.state.is_tunnel_active(tunnel["env"], tunnel["service"]):
                env = tunnel["env"]
                service = tunnel["service"]
                service_config = TUNNEL_CONFIGS[env]["services"][service]

                # Calculate uptime
                uptime_seconds = None
                if tunnel.get("started_at"):
                    try:
                        started = datetime.fromisoformat(tunnel["started_at"])
                        uptime_seconds = int((datetime.now() - started).total_seconds())
                    except:
                        pass

                tracked.append({
                    "id": key,
                    "env": env,
                    "service": service,
                    "name": service_config["name"],
                    "status": "running",
                    "pid": tunnel["pid"],
                    "local_port": service_config["local_port"],
                    "remote_port": service_config["remote_port"],
                    "host": service_config["host"],
                    "started_at": tunnel.get("started_at"),
                    "uptime_seconds": uptime_seconds
                })

        # Process orphaned tunnels
        orphaned = []
        orphaned_pids = self.find_orphaned_tunnels()
        for pid in orphaned_pids:
            info = self.get_orphaned_tunnel_info(pid)
            if info:
                orphaned.append(info)
            else:
                orphaned.append({"pid": pid, "port": None, "env": None, "host": None})

        return {"tracked": tracked, "orphaned": orphaned}

    def stop_all_tunnels(self) -> Tuple[int, str]:
        """
        Stop all active tunnels (including orphaned processes)
        Returns: (stopped_count, message)
        """
        stopped = 0
        messages = []

        # Stop tracked tunnels
        tunnels = self.state.get_all_tunnels()
        for key, tunnel in list(tunnels.items()):
            success, msg = self.stop_tunnel(tunnel["env"], tunnel["service"])
            if success:
                stopped += 1
                messages.append(msg)

        # Stop orphaned tunnels
        orphaned_pids = self.find_orphaned_tunnels()
        if orphaned_pids:
            messages.append(f"Found {len(orphaned_pids)} orphaned tunnel(s)")
            for pid in orphaned_pids:
                try:
                    # Try to kill process group first
                    try:
                        os.killpg(os.getpgid(pid), signal.SIGTERM)
                        messages.append(f"Stopped orphaned tunnel (PID: {pid} + children)")
                    except (OSError, ProcessLookupError):
                        # Fallback to single process
                        os.kill(pid, signal.SIGTERM)
                        messages.append(f"Stopped orphaned tunnel (PID: {pid})")
                    stopped += 1
                except (OSError, ProcessLookupError):
                    messages.append(f"Could not stop PID {pid} (already stopped?)")

        return stopped, "; ".join(messages)
