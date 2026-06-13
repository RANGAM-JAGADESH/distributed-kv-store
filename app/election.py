import threading
import time
from datetime import datetime

import app.heartbeat as hb

ELECTION_TIMEOUT = 5

is_candidate = False


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

                is_candidate = True

        time.sleep(1)


def start_election_monitor():

    thread = threading.Thread(
        target=monitor_heartbeat,
        daemon=True
    )

    thread.start()