import threading
import time
from datetime import datetime
import os
import requests

import app.heartbeat as hb
import app.raft_state as raft

from app.heartbeat import (
    start_heartbeat,
    configure_followers
)

from app.event_manager import add_event

NODE_ID = os.getenv(
    "NODE_ID",
    "node1"
)

ELECTION_TIMEOUT = 5

is_candidate = False


def start_election():

    global is_candidate

    raft.current_role = "candidate"

    votes = 1

    print(
        f"{NODE_ID} requesting votes..."
    )

    other_nodes = []

    if NODE_ID == "node2":

        other_nodes = [
            "http://127.0.0.1:8002"
        ]

    elif NODE_ID == "node3":

        other_nodes = [
            "http://127.0.0.1:8001"
        ]

    for node in other_nodes:

        try:

            response = requests.post(
                f"{node}/request_vote",
                params={
                    "candidate_id": NODE_ID
                }
            )

            result = response.json()

            if result.get(
                "vote_granted",
                False
            ):

                votes += 1
                add_event(
                    f"✅ Vote received from {node}"
                )

        except Exception as e:

            print(
                f"Vote request failed: {e}"
            )

    print(
        f"Votes received: {votes}"
    )

    if votes >= 2:

        raft.current_role = "leader"

        raft.current_leader = NODE_ID

        raft.current_term += 1

        raft.election_count += 1

        raft.leader_changes += 1
        raft.save_raft_state()
        print(
            f"🎉 {NODE_ID} elected as Leader!"
        )

        add_event(
            f"👑 {NODE_ID} elected as Leader"
        )

        if NODE_ID == "node2":

            configure_followers([
                "http://127.0.0.1:8002"
            ])

        elif NODE_ID == "node3":

            configure_followers([
                "http://127.0.0.1:8001"
            ])

        start_heartbeat()

        is_candidate = False


def monitor_heartbeat():

    global is_candidate

    while True:

        elapsed = (
            datetime.now()
            - hb.last_heartbeat
        ).total_seconds()

        print(
            f"[{NODE_ID}] elapsed={elapsed:.2f}"
        )

        if elapsed > ELECTION_TIMEOUT:

            

            if not is_candidate:

                print(
                    "\nLeader timeout detected!"
                )

                print(
                    "Starting Election..."
                )

                add_event(
                    "🗳️ Election Started"
                )

                is_candidate = True

                start_election()

        time.sleep(1)


def start_election_monitor():

    thread = threading.Thread(
        target=monitor_heartbeat,
        daemon=True
    )

    thread.start()