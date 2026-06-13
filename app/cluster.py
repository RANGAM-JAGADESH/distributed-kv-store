import os

LEADER_NODE = "node1"

def get_current_node():
    return os.getenv("NODE_ID")

def is_leader():
    return get_current_node() == LEADER_NODE