import os
import json

NODE_ID = os.getenv(
    "NODE_ID",
    "node1"
)

LOG_FILE = f"{NODE_ID}_raft_log.json"


def load_log():

    if not os.path.exists(LOG_FILE):

        with open(LOG_FILE, "w") as f:
            json.dump([], f)

    with open(LOG_FILE, "r") as f:
        return json.load(f)


def append_log(operation, key, value):

    logs = load_log()

    entry = {
        "index": len(logs) + 1,
        "operation": operation,
        "key": key,
        "value": value,
        "committed": False
    }

    logs.append(entry)

    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=4)

    return entry


def save_log_entry(entry):
    """
    Save the exact log entry received from leader.
    Avoid duplicate entries.
    """

    logs = load_log()

    # Prevent duplicate index insertion
    for log in logs:
        if log["index"] == entry["index"]:
            return

    logs.append(entry)

    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=4)


def commit_log(index):

    logs = load_log()

    for log in logs:

        if log["index"] == index:

            log["committed"] = True

    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=4)


def get_logs():

    return load_log()