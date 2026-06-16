import requests

from app.store import store


def restore_snapshot_from_leader():

    try:

        response = requests.get(
            "http://127.0.0.1:8000/snapshot_data"
        )

        data = response.json()

        store.data = data

        print(
            "📸 Snapshot received from Leader"
        )

        print(
            "✅ Node Rejoined Successfully"
        )

    except Exception as e:

        print(
            f"Snapshot Sync Failed: {e}"
        )