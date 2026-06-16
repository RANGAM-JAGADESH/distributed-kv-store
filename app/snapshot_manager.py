import json
from app.store import store

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