import json
import os

LOG_FILE = "raft_log.json"


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
        "value": value
    }

    logs.append(entry)

    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=4)

    return entry


def get_logs():

    return load_log()