/**
 * Tunnel Manager Web - Frontend Logic
 * Alpine.js components for managing tunnels
 */

// Service configurations
const SERVICES = {
    dev: {
        db: { name: 'PostgreSQL', local_port: '8432' },
        mongo: { name: 'MongoDB', local_port: '24017' },
        redis: { name: 'Redis', local_port: '6479' },
        rabbitmq: { name: 'RabbitMQ', local_port: '15672' }
    },
    pre: {
        db: { name: 'PostgreSQL', local_port: '8532' },
        mongo: { name: 'MongoDB', local_port: '24517' },
        redis: { name: 'Redis', local_port: '6579' },
        rabbitmq: { name: 'RabbitMQ', local_port: '15572' }
    },
    pro: {
        db: { name: 'PostgreSQL', local_port: '8432' },
        mongo: { name: 'MongoDB', local_port: '27027' },
        rabbitmq: { name: 'RabbitMQ', local_port: '15672' }
    }
};

// Main tunnel manager component
function tunnelManager() {
    return {
        tunnels: { tracked: [], orphaned: [] },
        orphaned: [],
        loading: false,
        message: '',
        messageType: 'success',
        lastUpdate: '',
        refreshInterval: null,

        async init() {
            await this.refresh();
            // Auto-refresh every 5 seconds
            this.refreshInterval = setInterval(() => this.refresh(), 5000);
        },

        async refresh() {
            this.loading = true;
            try {
                const response = await fetch('/api/tunnels');
                if (!response.ok) throw new Error('Failed to fetch tunnels');

                const data = await response.json();
                this.tunnels = data;
                this.orphaned = data.orphaned || [];
                this.lastUpdate = new Date().toLocaleTimeString();
            } catch (error) {
                this.showMessage('Error fetching tunnels: ' + error.message, 'error');
            } finally {
                this.loading = false;
            }
        },

        async stopAll() {
            if (!confirm('Stop all active tunnels?')) return;

            this.loading = true;
            try {
                const response = await fetch('/api/tunnels/stop-all', {
                    method: 'POST'
                });

                if (!response.ok) throw new Error('Failed to stop tunnels');

                const data = await response.json();
                this.showMessage(`Stopped ${data.stopped_count} tunnel(s)`, 'success');
                await this.refresh();
            } catch (error) {
                this.showMessage('Error stopping tunnels: ' + error.message, 'error');
            } finally {
                this.loading = false;
            }
        },

        showMessage(text, type = 'success') {
            this.message = text;
            this.messageType = type;
            setTimeout(() => {
                this.message = '';
            }, 5000);
        }
    };
}

// Individual tunnel card component
function tunnelCard(env, service) {
    return {
        env,
        service,
        loading: false,

        get tunnel() {
            const tunnelId = `${this.env}_${this.service}`;
            const tracked = this.$root.tunnels.tracked || [];
            const foundTunnel = tracked.find(t => t.id === tunnelId);

            if (foundTunnel) {
                return {
                    name: SERVICES[env][service].name,
                    local_port: SERVICES[env][service].local_port,
                    status: foundTunnel.status,
                    pid: foundTunnel.pid,
                    uptime_seconds: foundTunnel.uptime_seconds
                };
            } else {
                return {
                    name: SERVICES[env][service].name,
                    local_port: SERVICES[env][service].local_port,
                    status: 'stopped',
                    pid: null,
                    uptime_seconds: null
                };
            }
        },

        async toggleTunnel() {
            if (this.tunnel.status === 'running') {
                await this.stopTunnel();
            } else {
                await this.startTunnel();
            }
        },

        async startTunnel() {
            this.loading = true;
            try {
                const response = await fetch('/api/tunnels/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        env: this.env,
                        service: this.service
                    })
                });

                if (!response.ok) throw new Error('Failed to start tunnel');

                const data = await response.json();

                if (data.success) {
                    this.$root.showMessage(`${this.tunnel.name} tunnel started successfully`, 'success');
                    await this.$root.refresh();
                } else {
                    this.$root.showMessage(`Failed to start ${this.tunnel.name}: ${data.message}`, 'error');
                }
            } catch (error) {
                this.$root.showMessage(`Error starting ${this.tunnel.name}: ${error.message}`, 'error');
            } finally {
                this.loading = false;
            }
        },

        async stopTunnel() {
            this.loading = true;
            try {
                const response = await fetch('/api/tunnels/stop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        env: this.env,
                        service: this.service
                    })
                });

                if (!response.ok) throw new Error('Failed to stop tunnel');

                const data = await response.json();

                if (data.success) {
                    this.$root.showMessage(`${this.tunnel.name} tunnel stopped`, 'success');
                    await this.$root.refresh();
                } else {
                    this.$root.showMessage(`Failed to stop ${this.tunnel.name}: ${data.message}`, 'error');
                }
            } catch (error) {
                this.$root.showMessage(`Error stopping ${this.tunnel.name}: ${error.message}`, 'error');
            } finally {
                this.loading = false;
            }
        },

        formatUptime(seconds) {
            if (!seconds) return '';

            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);

            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                return `${minutes}m`;
            } else {
                return `${seconds}s`;
            }
        }
    };
}
