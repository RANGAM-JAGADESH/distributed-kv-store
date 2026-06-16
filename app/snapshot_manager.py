import json
from app.store import store
from app.log_manager import LOG_FILE



SNAPSHOT_FILE = "snapshot.json"


def create_snapshot():

    data = store.data

    with open(
        SNAPSHOT_FILE,
        "w"
    ) as f:

        json.dump(
            data,
            f,
            indent=4
        )

    print(
        "📸 Snapshot Created"
    )


def load_snapshot():

    try:

        with open(
            SNAPSHOT_FILE,
            "r"
        ) as f:

            data = json.load(f)

        store.data = data

        print(
            "📸 Snapshot Loaded"
        )

    except:

        print(
            "No Snapshot Found"
        )
        
        


def truncate_logs():

    print("LOG FILE =", LOG_FILE)

    with open(
        LOG_FILE,
        "w"
    ) as f:

        json.dump(
            [],
            f,
            indent=4
        )

    print(
        "🗑️ Logs truncated after snapshot"
    )