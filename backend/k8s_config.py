"""
Kubernetes Configuration
Manages K8s contexts and namespaces for different environments
"""

from pathlib import Path

# State file for K8s port-forwards
STATE_DIR = Path.home() / ".tunnel-manager"
STATE_DIR.mkdir(exist_ok=True)
K8S_STATE_FILE = STATE_DIR / "k8s_forwards.json"

# Kubernetes configurations per environment
K8S_CONFIGS = {
    'dev': {
        'context': 'arn:aws:eks:eu-central-1:730335355057:cluster/aws-eks-off-inb-dev',
        'account': '730335355057',
        'region': 'eu-central-1',
        'resources': {
            'invoice-producer': {
                'type': 'pod',
                'namespace': 'backend-factoring',
                'name': 'Invoice Producer',
                'prefix': 'invoice-producer-invoice-producer',
                'default_port': '8086',
                'suggested_local_port': '8080'
            },
            'grafana': {
                'type': 'service',
                'namespace': 'shared-services-dev',
                'name': 'Grafana',
                'service_name': 'ss-grafana',
                'default_port': '3000',
                'suggested_local_port': '3000'
            }
        }
    },
    'pre': {
        'context': 'arn:aws:eks:eu-central-1:869935070242:cluster/aws-eks-off-inb-pre',
        'account': '869935070242',
        'region': 'eu-central-1',
        'resources': {
            'invoice-producer': {
                'type': 'pod',
                'namespace': 'backend-factoring',
                'name': 'Invoice Producer',
                'prefix': 'invoice-producer-invoice-producer',
                'default_port': '8086',
                'suggested_local_port': '8080'
            },
            'grafana': {
                'type': 'service',
                'namespace': 'shared-services-pre',
                'name': 'Grafana',
                'service_name': 'ss-grafana',
                'default_port': '3000',
                'suggested_local_port': '3000'
            }
        }
    },
    'pro': {
        'context': 'arn:aws:eks:eu-central-1:571600864205:cluster/aws-eks-off-inb-pro',
        'account': '571600864205',
        'region': 'eu-central-1',
        'resources': {
            'invoice-producer': {
                'type': 'pod',
                'namespace': 'backend-factoring',
                'name': 'Invoice Producer',
                'prefix': 'invoice-producer-invoice-producer',
                'default_port': '8086',
                'suggested_local_port': '8080'
            }
        }
    },
    'shared': {
        'context': 'arn:aws:eks:eu-central-1:430118813768:cluster/aws-eks-sha-inb-pro',
        'account': '430118813768',
        'region': 'eu-central-1',
        'resources': {
            'grafana': {
                'type': 'service',
                'namespace': 'monitoring',
                'name': 'Grafana',
                'service_name': 'ss-grafana',
                'default_port': '80',
                'suggested_local_port': '3000'
            }
        }
    }
}
