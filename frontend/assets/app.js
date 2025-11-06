/**
 * Tunnel Manager Web - Frontend Logic
 * Alpine.js components for managing tunnels
 */

// Service configurations - complete info from backend config
const SERVICES = {
    dev: {
        profile: '730335355057_AWSDevelopersSSMAccess',
        region: 'eu-central-1',
        instance_tag: 'aws-common-nodes-off-inb-dev',
        db: {
            name: 'PostgreSQL',
            local_port: '8432',
            remote_port: '5432',
            host: 'aws-psql-off-inb-dev.cj2msqo02uut.eu-central-1.rds.amazonaws.com'
        },
        mongo: {
            name: 'MongoDB',
            local_port: '24017',
            remote_port: '27017',
            host: 'aws-docdb-clstr-off-inb-dev.cluster-cj2msqo02uut.eu-central-1.docdb.amazonaws.com'
        },
        redis: {
            name: 'Redis',
            local_port: '6479',
            remote_port: '6379',
            host: 'aws-redis-clstr-off-inb-dev.u9shfq.0001.euc1.cache.amazonaws.com'
        },
        rabbitmq: {
            name: 'RabbitMQ',
            local_port: '15672',
            remote_port: '443',
            host: 'b-719de680-d475-48f5-bf57-420b8581efca.mq.eu-central-1.on.aws'
        }
    },
    pre: {
        profile: '869935070242_AWSDevelopersSSMAccess',
        region: 'eu-central-1',
        instance_tag: 'aws-common-nodes-off-inb-pre',
        db: {
            name: 'PostgreSQL',
            local_port: '8532',
            remote_port: '5432',
            host: 'aws-psql-off-inb-pre.ctos6208kpfh.eu-central-1.rds.amazonaws.com'
        },
        mongo: {
            name: 'MongoDB',
            local_port: '24517',
            remote_port: '27017',
            host: 'aws-docdb-clstr-off-inb-pre.cluster-ctos6208kpfh.eu-central-1.docdb.amazonaws.com'
        },
        redis: {
            name: 'Redis',
            local_port: '6579',
            remote_port: '6379',
            host: 'aws-redis-clstr-rg-off-inb-pre.1ihnfa.ng.0001.euc1.cache.amazonaws.com'
        },
        rabbitmq: {
            name: 'RabbitMQ',
            local_port: '15572',
            remote_port: '443',
            host: 'b-c0e37dbb-ae83-4667-95cf-3459720ddb54.mq.eu-central-1.on.aws'
        }
    },
    pro: {
        profile: '571600864205_AWSDevelopersSSMAccess',
        region: 'eu-central-1',
        instance_tag: 'aws-common-nodes-off-inb-pro',
        db: {
            name: 'PostgreSQL',
            local_port: '8432',
            remote_port: '5432',
            host: 'aws-psql-off-inb-pro.c522iagi0n4g.eu-central-1.rds.amazonaws.com'
        },
        mongo: {
            name: 'MongoDB',
            local_port: '24017',
            remote_port: '27017',
            host: 'aws-docdb-clstr-off-inb-pro.cluster-c522iagi0n4g.eu-central-1.docdb.amazonaws.com'
        },
        rabbitmq: {
            name: 'RabbitMQ',
            local_port: '15672',
            remote_port: '443',
            host: 'b-c943af77-c008-4dc6-9175-2e5aa817219c.mq.eu-central-1.amazonaws.com'
        }
    }
};

// Global modal instance (will be set when modal component initializes)
window.showModal = null;
window.showInfoModal = null;

// Modal confirmation component
function modalManager() {
    return {
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        type: 'warning',
        modalType: 'confirm', // 'confirm' or 'info'
        infoData: null,
        onConfirm: null,
        onCancel: null,

        init() {
            // Register global show functions
            window.showModal = (options) => this.show(options);
            window.showInfoModal = (options) => this.showInfo(options);
        },

        show(options) {
            this.modalType = 'confirm';
            this.title = options.title || 'Confirm';
            this.message = options.message || '';
            this.confirmText = options.confirmText || 'Confirm';
            this.cancelText = options.cancelText || 'Cancel';
            this.type = options.type || 'warning';

            return new Promise((resolve) => {
                this.onConfirm = () => {
                    this.close();
                    resolve(true);
                };
                this.onCancel = () => {
                    this.close();
                    resolve(false);
                };
                this.isOpen = true;
            });
        },

        showInfo(options) {
            this.modalType = 'info';
            this.title = options.title || 'Information';
            this.infoData = options.data || {};
            this.type = 'info';
            this.isOpen = true;
        },

        close() {
            this.isOpen = false;
            this.infoData = null;
        },

        getIcon() {
            const icons = {
                warning: '⚠️',
                danger: '🗑️',
                info: 'ℹ️',
                question: '❓'
            };
            return icons[this.type] || icons.warning;
        },

        getColorClasses() {
            const classes = {
                warning: 'text-yellow-600',
                danger: 'text-red-600',
                info: 'text-blue-400',
                question: 'text-gray-600'
            };
            return classes[this.type] || classes.warning;
        },

        getConnectionString() {
            if (!this.infoData) return '';
            const { service, local_port } = this.infoData;

            const templates = {
                db: `postgresql://user:password@localhost:${local_port}/database`,
                mongo: `mongodb://username:password@localhost:${local_port}/`,
                redis: `redis://localhost:${local_port}`,
                rabbitmq: `amqp://user:password@localhost:${local_port}/`
            };

            return templates[service] || '';
        },

        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: 'Copied to clipboard!', type: 'success', duration: 2000 }
                }));
            });
        }
    };
}

// Toast notification component
function toastManager() {
    return {
        toasts: [],
        nextId: 1,

        show(message, type = 'success', duration = 5000) {
            const id = this.nextId++;
            const toast = { id, message, type };
            this.toasts.push(toast);

            // Auto-remove after duration
            setTimeout(() => {
                this.remove(id);
            }, duration);
        },

        remove(id) {
            this.toasts = this.toasts.filter(t => t.id !== id);
        },

        getIcon(type) {
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };
            return icons[type] || icons.info;
        },

        getColorClasses(type) {
            const classes = {
                success: 'bg-green-500',
                error: 'bg-red-500',
                warning: 'bg-yellow-500',
                info: 'bg-blue-500'
            };
            return classes[type] || classes.info;
        }
    };
}

// Main tunnel manager component
function tunnelManager() {
    return {
        tunnels: { tracked: [], orphaned: [] },
        orphaned: [],
        loading: false,
        lastUpdate: '',
        refreshInterval: null,
        autoRefreshSeconds: 60,
        refreshOptions: [
            { value: 5, label: '5 seconds' },
            { value: 10, label: '10 seconds' },
            { value: 30, label: '30 seconds' },
            { value: 60, label: '1 minute' },
            { value: 120, label: '2 minutes' },
            { value: 300, label: '5 minutes' }
        ],

        async init() {
            await this.refresh(true);
            this.startAutoRefresh();
        },

        startAutoRefresh() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            this.refreshInterval = setInterval(() => this.refresh(true), this.autoRefreshSeconds * 1000);
        },

        changeRefreshInterval(seconds) {
            this.autoRefreshSeconds = seconds;
            this.startAutoRefresh();
            window.dispatchEvent(new CustomEvent('show-toast', {
                detail: { message: `Auto-refresh set to ${this.getRefreshLabel()}`, type: 'success' }
            }));
        },

        getRefreshLabel() {
            const option = this.refreshOptions.find(opt => opt.value === this.autoRefreshSeconds);
            return option ? option.label : `${this.autoRefreshSeconds} seconds`;
        },

        async refresh(silent = false) {
            if (!silent) {
                this.loading = true;
            }
            try {
                const response = await fetch('/api/tunnels');
                if (!response.ok) throw new Error('Failed to fetch tunnels');

                const data = await response.json();
                this.tunnels = data;
                this.orphaned = data.orphaned || [];
                this.lastUpdate = new Date().toLocaleTimeString();

                // Dispatch event to notify all cards
                window.dispatchEvent(new CustomEvent('tunnels-updated', { detail: data }));
            } catch (error) {
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: 'Error fetching tunnels: ' + error.message, type: 'error' }
                }));
            } finally {
                if (!silent) {
                    this.loading = false;
                }
            }
        },

        async stopAll() {
            const confirmed = await window.showModal({
                title: 'Stop All Tunnels',
                message: 'Are you sure you want to stop all active tunnels?',
                confirmText: 'Stop All',
                cancelText: 'Cancel',
                type: 'danger'
            });

            if (!confirmed) return;

            this.loading = true;
            try {
                const response = await fetch('/api/tunnels/stop-all', {
                    method: 'POST'
                });

                if (!response.ok) throw new Error('Failed to stop tunnels');

                const data = await response.json();
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: `Stopped ${data.stopped_count} tunnel(s)`, type: 'success' }
                }));
                await this.refresh(true);
            } catch (error) {
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: 'Error stopping tunnels: ' + error.message, type: 'error' }
                }));
            } finally {
                this.loading = false;
            }
        },

        async quit() {
            const confirmed = await window.showModal({
                title: 'Quit Application',
                message: 'Are you sure you want to quit? This will stop the backend server and close the application.',
                confirmText: 'Quit',
                cancelText: 'Cancel',
                type: 'warning'
            });

            if (!confirmed) return;

            try {
                // Call shutdown endpoint
                await fetch('/api/shutdown', {
                    method: 'POST'
                });

                // Show goodbye message
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: 'Application shutting down...', type: 'info' }
                }));

                // Give time for toast to show, then close window
                setTimeout(() => {
                    window.close();
                }, 1000);
            } catch (error) {
                // Ignore errors as server might already be down
                window.close();
            }
        }
    };
}

// Individual tunnel card component
function tunnelCard(env, service) {
    return {
        env,
        service,
        loading: false,
        name: SERVICES[env][service].name,
        local_port: SERVICES[env][service].local_port,
        status: 'stopped',
        pid: null,
        uptime_seconds: null,

        init() {
            // Listen for tunnel updates
            window.addEventListener('tunnels-updated', (event) => {
                const tunnelId = `${this.env}_${this.service}`;
                const tracked = event.detail?.tracked || [];
                const foundTunnel = tracked.find(t => t.id === tunnelId);

                if (foundTunnel) {
                    this.status = foundTunnel.status;
                    this.pid = foundTunnel.pid;
                    this.uptime_seconds = foundTunnel.uptime_seconds;
                } else {
                    this.status = 'stopped';
                    this.pid = null;
                    this.uptime_seconds = null;
                }
            });
        },

        async toggleTunnel() {
            if (this.status === 'running') {
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
                    // Update local state immediately
                    this.status = 'running';
                    this.pid = data.pid;

                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: `${this.name} tunnel started successfully`, type: 'success' }
                    }));
                } else {
                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: `Failed to start ${this.name}: ${data.message}`, type: 'error' }
                    }));
                }
            } catch (error) {
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: `Error starting ${this.name}: ${error.message}`, type: 'error' }
                }));
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
                    // Update local state immediately
                    this.status = 'stopped';
                    this.pid = null;
                    this.uptime_seconds = null;

                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: `${this.name} tunnel stopped`, type: 'success' }
                    }));
                } else {
                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: `Failed to stop ${this.name}: ${data.message}`, type: 'error' }
                    }));
                }
            } catch (error) {
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: `Error stopping ${this.name}: ${error.message}`, type: 'error' }
                }));
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
        },

        showInfo() {
            const envConfig = SERVICES[this.env];
            const serviceConfig = envConfig[this.service];

            window.showInfoModal({
                title: `${this.name} - ${this.env.toUpperCase()}`,
                data: {
                    name: this.name,
                    env: this.env.toUpperCase(),
                    service: this.service,
                    status: this.status,
                    pid: this.pid,
                    uptime: this.uptime_seconds ? this.formatUptime(this.uptime_seconds) : null,
                    local_port: serviceConfig.local_port,
                    remote_port: serviceConfig.remote_port,
                    host: serviceConfig.host,
                    profile: envConfig.profile,
                    region: envConfig.region,
                    instance_tag: envConfig.instance_tag
                }
            });
        }
    };
}
