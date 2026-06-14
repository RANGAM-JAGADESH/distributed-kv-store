import os
import app.raft_state as raft

CURRENT_NODE = os.getenv("NODE_ID", "node1")

def is_leader():
    return CURRENT_NODE == raft.current_leader