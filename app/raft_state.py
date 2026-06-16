import json
import os

STATE_FILE = "raft_state.json"

current_role = "follower"

current_leader = "node1"

voted_for = None

commit_index = 0

current_term = 1

election_count = 0

leader_changes = 0


def save_raft_state():

    state = {

        "current_role":
        current_role,

        "current_leader":
        current_leader,

        "voted_for":
        voted_for,

        "commit_index":
        commit_index,

        "current_term":
        current_term,

        "election_count":
        election_count,

        "leader_changes":
        leader_changes

    }

    with open(
        STATE_FILE,
        "w"
    ) as f:

        json.dump(
            state,
            f,
            indent=4
        )


def load_raft_state():

    global current_role
    global current_leader
    global voted_for
    global commit_index
    global current_term
    global election_count
    global leader_changes

    if not os.path.exists(
        STATE_FILE
    ):

        return

    with open(
        STATE_FILE,
        "r"
    ) as f:

        state = json.load(f)

    current_role = state.get(
        "current_role",
        "follower"
    )

    current_leader = state.get(
        "current_leader",
        "node1"
    )

    voted_for = state.get(
        "voted_for"
    )

    commit_index = state.get(
        "commit_index",
        0
    )

    current_term = state.get(
        "current_term",
        1
    )

    election_count = state.get(
        "election_count",
        0
    )

    leader_changes = state.get(
        "leader_changes",
        0
    )

    print(
        "✅ Raft state recovered"
    )
