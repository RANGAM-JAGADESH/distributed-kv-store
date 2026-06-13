import threading
import time
from datetime import datetime
import requests
import app.raft_state as raft
import app.heartbeat as hb

ELECTION_TIMEOUT = 5

is_candidate = False
OTHER_NODES = [
    "http://127.0.0.1:8001",
    "http://127.0.0.1:8002"
]

def monitor_heartbeat():

    global is_candidate

    while True:

        elapsed = (
            datetime.now() -
            hb.last_heartbeat
        ).total_seconds()

        if elapsed > ELECTION_TIMEOUT:

            if not is_candidate:

                print(
                    "\nLeader timeout detected!"
                )

                print(
                    "Starting Election..."
                )

                start_election()

                is_candidate = True

        time.sleep(1)


def start_election_monitor():

    thread = threading.Thread(
        target=monitor_heartbeat,
        daemon=True
    )

    thread.start()
    
def start_election():

    votes = 1

    print("Requesting votes...")

    for node in OTHER_NODES:

        try:

            response = requests.post(
                f"{node}/request_vote",
                params={
                    "candidate_id": "node2"
                }
            )

            result = response.json()

            if result["vote_granted"]:
                votes += 1

        except:
            pass

    print(f"Votes received: {votes}")

    if votes >= 2:

        raft.current_role = "leader"

        raft.current_leader = "node2"

        print(
            "🎉 Node2 elected as Leader!"
        )