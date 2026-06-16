import json
import app.raft_state as raft

RAFT_STATE_FILE = "raft_state.json"


def save_raft_state():

    data = {
        "current_term": raft.current_term,
        "current_leader": raft.current_leader,
        "commit_index": raft.commit_index,
        "election_count": raft.election_count,
        "leader_changes": raft.leader_changes
    }

    with open(
        RAFT_STATE_FILE,
        "w"
    ) as file:

        json.dump(
            data,
            file,
            indent=4
        )


def load_raft_state():

    try:

        with open(
            RAFT_STATE_FILE,
            "r"
        ) as file:

            data = json.load(file)

            raft.current_term = data.get(
                "current_term",
                1
            )

            raft.current_leader = data.get(
                "current_leader",
                "node1"
            )

            raft.commit_index = data.get(
                "commit_index",
                0
            )

            raft.election_count = data.get(
                "election_count",
                0
            )

            raft.leader_changes = data.get(
                "leader_changes",
                0
            )

    except:

        print(
            "No raft state found."
        )