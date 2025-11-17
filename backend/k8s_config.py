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
        'namespace': 'backend-factoring',
        'account': '730335355057',
        'region': 'eu-central-1',
        'pods': {
            'invoice-producer': {
                'name': 'Invoice Producer',
                'prefix': 'invoice-producer-invoice-producer',
                'default_port': '8086',
                'suggested_local_port': '8080'
            }
        }
    },
    'pre': {
        'context': 'arn:aws:eks:eu-central-1:869935070242:cluster/aws-eks-off-inb-pre',
        'namespace': 'backend-factoring',
        'account': '869935070242',
        'region': 'eu-central-1',
        'pods': {
            'invoice-producer': {
                'name': 'Invoice Producer',
                'prefix': 'invoice-producer-invoice-producer',
                'default_port': '8086',
                'suggested_local_port': '8080'
            }
        }
    },
    'pro': {
        'context': 'arn:aws:eks:eu-central-1:571600864205:cluster/aws-eks-off-inb-pro',
        'namespace': 'backend-factoring',
        'account': '571600864205',
        'region': 'eu-central-1',
        'pods': {
            'invoice-producer': {
                'name': 'Invoice Producer',
                'prefix': 'invoice-producer-invoice-producer',
                'default_port': '8086',
                'suggested_local_port': '8080'
            }
        }
    }
}
