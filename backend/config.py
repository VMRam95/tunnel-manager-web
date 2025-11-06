"""
Configuration for Tunnel Manager Web
"""

from pathlib import Path

# Server configuration
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 5678

# Paths
STATE_FILE = Path.home() / ".ssm-tunnels-state.json"
SCRIPTS_DIR = Path.home() / "Documents" / "Scripts"

# Tunnel configurations - imported from existing tunnel manager
TUNNEL_CONFIGS = {
    "dev": {
        "profile": "730335355057_AWSDevelopersSSMAccess",
        "region": "eu-central-1",
        "instance_tag": "aws-common-nodes-off-inb-dev",
        "services": {
            "db": {
                "name": "PostgreSQL",
                "remote_port": "5432",
                "local_port": "8432",
                "host": "aws-psql-off-inb-dev.cj2msqo02uut.eu-central-1.rds.amazonaws.com"
            },
            "mongo": {
                "name": "MongoDB",
                "remote_port": "27017",
                "local_port": "24017",
                "host": "aws-docdb-clstr-off-inb-dev.cluster-cj2msqo02uut.eu-central-1.docdb.amazonaws.com"
            },
            "redis": {
                "name": "Redis",
                "remote_port": "6379",
                "local_port": "6479",
                "host": "aws-redis-clstr-off-inb-dev.u9shfq.0001.euc1.cache.amazonaws.com"
            },
            "rabbitmq": {
                "name": "RabbitMQ",
                "remote_port": "443",
                "local_port": "15672",
                "host": "b-719de680-d475-48f5-bf57-420b8581efca.mq.eu-central-1.on.aws"
            }
        }
    },
    "pre": {
        "profile": "869935070242_AWSDevelopersSSMAccess",
        "region": "eu-central-1",
        "instance_tag": "aws-common-nodes-off-inb-pre",
        "services": {
            "db": {
                "name": "PostgreSQL",
                "remote_port": "5432",
                "local_port": "8532",
                "host": "aws-psql-off-inb-pre.ctos6208kpfh.eu-central-1.rds.amazonaws.com"
            },
            "mongo": {
                "name": "MongoDB",
                "remote_port": "27017",
                "local_port": "24517",
                "host": "aws-docdb-clstr-off-inb-pre.cluster-ctos6208kpfh.eu-central-1.docdb.amazonaws.com"
            },
            "redis": {
                "name": "Redis",
                "remote_port": "6379",
                "local_port": "6579",
                "host": "aws-redis-clstr-rg-off-inb-pre.1ihnfa.ng.0001.euc1.cache.amazonaws.com"
            },
            "rabbitmq": {
                "name": "RabbitMQ",
                "remote_port": "443",
                "local_port": "15572",
                "host": "b-c0e37dbb-ae83-4667-95cf-3459720ddb54.mq.eu-central-1.on.aws"
            }
        }
    },
    "pro": {
        "profile": "571600864205_AWSDevelopersSSMAccess",
        "region": "eu-central-1",
        "instance_tag": "aws-common-nodes-off-inb-pro",
        "services": {
            "db": {
                "name": "PostgreSQL",
                "remote_port": "5432",
                "local_port": "8432",
                "host": "aws-psql-off-inb-pro.c522iagi0n4g.eu-central-1.rds.amazonaws.com"
            },
            "mongo": {
                "name": "MongoDB",
                "remote_port": "27017",
                "local_port": "24017",
                "host": "aws-docdb-clstr-off-inb-pro.cluster-c522iagi0n4g.eu-central-1.docdb.amazonaws.com"
            },
            "rabbitmq": {
                "name": "RabbitMQ",
                "remote_port": "443",
                "local_port": "15672",
                "host": "b-c943af77-c008-4dc6-9175-2e5aa817219c.mq.eu-central-1.amazonaws.com"
            }
        }
    }
}
