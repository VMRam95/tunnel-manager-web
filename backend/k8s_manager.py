"""
Kubernetes Port-Forward Manager
Manages kubectl port-forward processes for pods
"""

import subprocess
import json
import os
import signal
import re
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path

from .k8s_config import K8S_STATE_FILE, K8S_CONFIGS


class K8sForwardState:
    """Manages K8s port-forward state persistence"""

    def __init__(self):
        self.state = self.load_state()

    def load_state(self) -> Dict:
        """Load port-forward state from file"""
        if K8S_STATE_FILE.exists():
            try:
                with open(K8S_STATE_FILE, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def save_state(self):
        """Save port-forward state to file"""
        K8S_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(K8S_STATE_FILE, 'w') as f:
            json.dump(self.state, f, indent=2)

    def add_forward(self, env: str, pod_type: str, pod_name: str, pid: int, local_port: str, remote_port: str):
        """Add a port-forward to state"""
        key = f"{env}_{pod_type}"
        self.state[key] = {
            "env": env,
            "pod_type": pod_type,
            "pod_name": pod_name,
            "pid": pid,
            "local_port": local_port,
            "remote_port": remote_port,
            "started_at": datetime.now().isoformat()
        }
        self.save_state()

    def remove_forward(self, env: str, pod_type: str):
        """Remove a port-forward from state"""
        key = f"{env}_{pod_type}"
        if key in self.state:
            del self.state[key]
            self.save_state()

    def get_forward(self, env: str, pod_type: str) -> Optional[Dict]:
        """Get port-forward state"""
        key = f"{env}_{pod_type}"
        return self.state.get(key)

    def is_forward_active(self, env: str, pod_type: str) -> bool:
        """Check if port-forward is active"""
        forward = self.get_forward(env, pod_type)
        if not forward:
            return False

        pid = forward.get('pid')
        if not pid:
            return False

        # Check if process is still running
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            # Process not found, remove from state
            self.remove_forward(env, pod_type)
            return False

    def cleanup_orphaned(self):
        """Remove port-forwards with dead processes"""
        to_remove = []
        for key, forward in self.state.items():
            pid = forward.get('pid')
            if pid:
                try:
                    os.kill(pid, 0)
                except OSError:
                    to_remove.append(key)

        for key in to_remove:
            env, pod_type = key.split('_', 1)
            self.remove_forward(env, pod_type)


class K8sPortForwardManager:
    """Manages Kubernetes port-forward operations"""

    def __init__(self):
        self.state = K8sForwardState()

    def list_pods(self, env: str) -> List[Dict]:
        """List all pods for an environment"""
        env_config = K8S_CONFIGS.get(env)
        if not env_config:
            return []

        context = env_config['context']
        namespace = env_config['namespace']
        pods_config = env_config['pods']

        all_pods = []

        for pod_type, pod_info in pods_config.items():
            prefix = pod_info['prefix']

            # Get pods matching prefix
            cmd = [
                'kubectl',
                '--context', context,
                'get', 'pods',
                '-n', namespace,
                '--no-headers',
                '-o', 'custom-columns=NAME:.metadata.name,STATUS:.status.phase,AGE:.metadata.creationTimestamp'
            ]

            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        if not line.strip():
                            continue
                        parts = line.split()
                        if len(parts) >= 2:
                            pod_name = parts[0]
                            if pod_name.startswith(prefix):
                                status = parts[1]

                                # Calculate age
                                age = "Unknown"
                                if len(parts) >= 3:
                                    try:
                                        created_at = datetime.fromisoformat(parts[2].replace('Z', '+00:00'))
                                        age_seconds = (datetime.now().astimezone() - created_at).total_seconds()
                                        age = self._format_age(age_seconds)
                                    except:
                                        pass

                                # Check if port-forward is active
                                forward = self.state.get_forward(env, pod_type)
                                is_forwarding = forward is not None and forward.get('pod_name') == pod_name and self.state.is_forward_active(env, pod_type)

                                pod_data = {
                                    "pod_type": pod_type,
                                    "pod_name": pod_name,
                                    "display_name": pod_info['name'],
                                    "status": status,
                                    "age": age,
                                    "default_port": pod_info['default_port'],
                                    "suggested_local_port": pod_info['suggested_local_port'],
                                    "is_forwarding": is_forwarding,
                                    "forward_info": forward if is_forwarding else None
                                }
                                all_pods.append(pod_data)
            except subprocess.TimeoutExpired:
                pass
            except Exception as e:
                pass

        return all_pods

    def start_port_forward(self, env: str, pod_type: str, pod_name: str, local_port: str, remote_port: str) -> Tuple[bool, str, Optional[int]]:
        """Start a port-forward"""
        # Check if already forwarding
        if self.state.is_forward_active(env, pod_type):
            return False, f"Port-forward already active for {env.upper()} {pod_type}", None

        # Get configuration
        env_config = K8S_CONFIGS.get(env)
        if not env_config:
            return False, f"Invalid environment: {env}", None

        context = env_config['context']
        namespace = env_config['namespace']

        # Build kubectl command
        cmd = [
            'kubectl',
            '--context', context,
            'port-forward',
            '-n', namespace,
            f'pod/{pod_name}',
            f'{local_port}:{remote_port}'
        ]

        try:
            # Start port-forward process in background
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True
            )

            # Wait a bit to check if it started successfully
            time.sleep(1)

            # Check if process is still running
            if process.poll() is not None:
                stderr = process.stderr.read().decode('utf-8') if process.stderr else ""
                return False, f"Failed to start port-forward: {stderr}", None

            # Add to state
            self.state.add_forward(env, pod_type, pod_name, process.pid, local_port, remote_port)

            return True, f"Port-forward started on localhost:{local_port}", process.pid

        except Exception as e:
            return False, f"Error starting port-forward: {str(e)}", None

    def stop_port_forward(self, env: str, pod_type: str) -> Tuple[bool, str]:
        """Stop a port-forward"""
        forward = self.state.get_forward(env, pod_type)
        if not forward:
            return False, "Port-forward not found"

        pid = forward.get('pid')
        if not pid:
            self.state.remove_forward(env, pod_type)
            return False, "No PID found for port-forward"

        try:
            # Kill the process group
            try:
                os.killpg(os.getpgid(pid), signal.SIGTERM)
            except ProcessLookupError:
                # Process already dead
                pass

            # Wait a bit and force kill if needed
            time.sleep(0.5)
            try:
                os.kill(pid, 0)  # Check if still alive
                os.killpg(os.getpgid(pid), signal.SIGKILL)
            except OSError:
                pass  # Already dead

            # Remove from state
            self.state.remove_forward(env, pod_type)

            return True, "Port-forward stopped"

        except Exception as e:
            # Remove from state anyway
            self.state.remove_forward(env, pod_type)
            return True, f"Port-forward stopped (with warning: {str(e)})"

    def stop_all_forwards(self) -> Tuple[int, List[str]]:
        """Stop all active port-forwards"""
        stopped_count = 0
        errors = []

        # Get all forwards
        forwards = list(self.state.state.items())

        for key, forward in forwards:
            env = forward.get('env')
            pod_type = forward.get('pod_type')

            if env and pod_type:
                success, message = self.stop_port_forward(env, pod_type)
                if success:
                    stopped_count += 1
                else:
                    errors.append(message)

        return stopped_count, errors

    def get_all_forwards(self) -> Dict[str, List[Dict]]:
        """Get all active port-forwards grouped by environment"""
        self.state.cleanup_orphaned()

        forwards_by_env = {
            'dev': [],
            'pre': [],
            'pro': []
        }

        for key, forward in self.state.state.items():
            env = forward.get('env')
            if env in forwards_by_env:
                # Calculate uptime
                started_at = forward.get('started_at')
                uptime_seconds = None
                if started_at:
                    try:
                        start_time = datetime.fromisoformat(started_at)
                        uptime_seconds = int((datetime.now() - start_time).total_seconds())
                    except:
                        pass

                forward_info = {
                    **forward,
                    'uptime_seconds': uptime_seconds
                }
                forwards_by_env[env].append(forward_info)

        return forwards_by_env

    @staticmethod
    def _format_age(seconds: float) -> str:
        """Format age in human readable format"""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            return f"{int(seconds / 60)}m"
        elif seconds < 86400:
            return f"{int(seconds / 3600)}h"
        else:
            return f"{int(seconds / 86400)}d"
