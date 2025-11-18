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

// K8s configurations matching backend k8s_config.py
const K8S_CONFIGS = {
    'dev': {
        'invoice-producer': {
            name: 'Invoice Producer',
            default_port: '8086',
            suggested_local_port: '8080',
            resource_kind: 'pod'
        }
    },
    'pre': {
        'invoice-producer': {
            name: 'Invoice Producer',
            default_port: '8086',
            suggested_local_port: '8080',
            resource_kind: 'pod'
        }
    },
    'pro': {
        'invoice-producer': {
            name: 'Invoice Producer',
            default_port: '8086',
            suggested_local_port: '8080',
            resource_kind: 'pod'
        }
    },
    'shared': {
        'grafana': {
            name: 'Grafana',
            default_port: '80',
            suggested_local_port: '3000',
            resource_kind: 'service',
            service_name: 'ss-grafana'
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
        // Tab management
        activeTab: 'tunnels', // 'tunnels' or 'k8s'

        // Tunnels data
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

        // K8s data
        k8sPods: { dev: [], pre: [], pro: [] },
        k8sForwards: { dev: [], pre: [], pro: [] },
        k8sLoading: false,

        async init() {
            await this.refresh(true);
            this.startAutoRefresh();
        },

        setActiveTab(tab) {
            this.activeTab = tab;
            if (tab === 'k8s') {
                this.refreshK8s();
            }
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
        },

        // K8s Methods
        async refreshK8s() {
            this.k8sLoading = true;
            try {
                // Fetch pods
                const podsResponse = await fetch('/api/k8s/pods');
                if (!podsResponse.ok) throw new Error('Failed to fetch K8s pods');
                const podsData = await podsResponse.json();
                this.k8sPods = podsData.pods;

                // Fetch active forwards
                const forwardsResponse = await fetch('/api/k8s/port-forwards');
                if (!forwardsResponse.ok) throw new Error('Failed to fetch K8s port-forwards');
                const forwardsData = await forwardsResponse.json();
                this.k8sForwards = forwardsData.forwards;

                // Dispatch event to notify all K8s pod cards
                window.dispatchEvent(new CustomEvent('k8s-pods-updated', {
                    detail: {
                        pods: this.k8sPods,
                        forwards: this.k8sForwards
                    }
                }));

            } catch (error) {
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: 'Error fetching K8s data: ' + error.message, type: 'error' }
                }));
            } finally {
                this.k8sLoading = false;
            }
        },

        async startK8sForward(env, podType, podName, localPort, remotePort) {
            try {
                const response = await fetch('/api/k8s/port-forward/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        env,
                        pod_type: podType,
                        pod_name: podName,
                        local_port: localPort,
                        remote_port: remotePort
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: data.message, type: 'success' }
                    }));
                    // Individual pod cards handle their own state updates
                } else {
                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: data.detail || 'Failed to start port-forward', type: 'error' }
                    }));
                }
            } catch (error) {
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: 'Error: ' + error.message, type: 'error' }
                }));
            }
        },

        async stopK8sForward(env, podType) {
            try {
                const response = await fetch('/api/k8s/port-forward/stop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ env, pod_type: podType })
                });

                const data = await response.json();

                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: data.message, type: data.success ? 'success' : 'error' }
                }));

                // Individual pod cards handle their own state updates
            } catch (error) {
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: 'Error: ' + error.message, type: 'error' }
                }));
            }
        },

        async stopAllK8sForwards() {
            const confirmed = await window.showModal({
                title: 'Stop All Port-Forwards',
                message: 'Are you sure you want to stop all active K8s port-forwards?',
                confirmText: 'Stop All',
                cancelText: 'Cancel',
                type: 'danger'
            });

            if (!confirmed) return;

            try {
                const response = await fetch('/api/k8s/port-forward/stop-all', {
                    method: 'POST'
                });

                const data = await response.json();

                if (data.success) {
                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: `Stopped ${data.stopped_count} port-forward(s)`, type: 'success' }
                    }));
                    await this.refreshK8s();
                }
            } catch (error) {
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: 'Error: ' + error.message, type: 'error' }
                }));
            }
        },

        formatUptime(seconds) {
            if (!seconds) return '';
            if (seconds < 60) return `${seconds}s`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
            return `${Math.floor(seconds / 86400)}d`;
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
                    type: 'tunnel',
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

// Individual K8s pod card component
function k8sPodCard(env, podType, podConfig) {
    return {
        env,
        podType,
        name: podConfig.name,
        defaultPort: podConfig.default_port,
        suggestedLocalPort: podConfig.suggested_local_port,
        resourceKind: podConfig.resource_kind || 'pod',
        loading: false,
        status: 'stopped',
        pid: null,
        localPort: null,
        // For services, set podName immediately from config (service_name)
        // For pods, it will be set from k8s-pods-updated event
        podName: (podConfig.resource_kind === 'service' && podConfig.service_name) ? podConfig.service_name : null,
        // Flag to track if initial data has been loaded (for consistent "Loading..." display)
        dataLoaded: false,

        init() {
            // Listen for K8s pods updates
            window.addEventListener('k8s-pods-updated', (event) => {
                const podsData = event.detail?.pods || {};
                const forwardsData = event.detail?.forwards || {};

                // Mark data as loaded after first event
                this.dataLoaded = true;

                // Get resources for this environment
                const envResources = podsData[this.env] || [];

                // Find the resource for this type
                const foundResource = envResources.find(p => p.pod_type === this.podType);
                if (foundResource) {
                    this.podName = foundResource.pod_name;
                }

                // Check if there's an active forward for this resource type
                const envForwards = forwardsData[this.env] || [];
                const activeForward = envForwards.find(f => f.pod_type === this.podType);

                if (activeForward) {
                    this.status = 'running';
                    this.pid = activeForward.pid;
                    this.localPort = activeForward.local_port;
                } else {
                    this.status = 'stopped';
                    this.pid = null;
                    this.localPort = null;
                }
            });
        },

        async toggleForward() {
            if (this.status === 'running') {
                await this.stopForward();
            } else {
                await this.startForward();
            }
        },

        async startForward() {
            // For services, podName is the service name and is always available
            if (!this.podName && this.resourceKind !== 'service') {
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: `No ${this.name} pod found in ${this.env.toUpperCase()}`, type: 'error' }
                }));
                return;
            }

            this.loading = true;
            try {
                const response = await fetch('/api/k8s/port-forward/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        env: this.env,
                        pod_type: this.podType,
                        pod_name: this.podName,
                        local_port: this.suggestedLocalPort,
                        remote_port: this.defaultPort
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Update local state immediately
                    this.status = 'running';
                    this.pid = data.pid;
                    this.localPort = data.local_port;

                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: `${this.name} port-forward started on port ${data.local_port}`, type: 'success' }
                    }));
                } else {
                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: data.detail || `Failed to start ${this.name} port-forward`, type: 'error' }
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

        async stopForward() {
            this.loading = true;
            try {
                const response = await fetch('/api/k8s/port-forward/stop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        env: this.env,
                        pod_type: this.podType
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Update local state immediately
                    this.status = 'stopped';
                    this.pid = null;
                    this.localPort = null;

                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: `${this.name} port-forward stopped`, type: 'success' }
                    }));
                } else {
                    window.dispatchEvent(new CustomEvent('show-toast', {
                        detail: { message: data.message || `Failed to stop ${this.name}`, type: 'error' }
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

        showInfo() {
            window.showInfoModal({
                title: `${this.name} - ${this.env.toUpperCase()}`,
                data: {
                    type: 'k8s',
                    name: this.name,
                    env: this.env.toUpperCase(),
                    pod_type: this.podType,
                    pod_name: this.podName,
                    status: this.status,
                    pid: this.pid,
                    local_port: this.localPort || this.suggestedLocalPort,
                    remote_port: this.defaultPort
                }
            });
        }
    };
}
