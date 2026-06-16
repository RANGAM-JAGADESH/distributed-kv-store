import requests

from app.log_manager import (
    get_logs,
    save_log_entry,
    commit_log
)

from app.store import store


def sync_from_leader():

    try:

        local_logs = get_logs()

        if len(local_logs) == 0:

            last_index = 0

        else:

            last_index = local_logs[-1]["index"]

        response = requests.get(

            "http://127.0.0.1:8000/missing_logs",

            params={
                "last_index": last_index
            }

        )

        missing_logs = response.json()

        print(
            f"Found {len(missing_logs)} missing logs"
        )

        for entry in missing_logs:

            save_log_entry(entry)

            if entry["committed"]:

                store.set(
                    entry["key"],
                    entry["value"]
                )

                commit_log(
                    entry["index"]
                )

            print(
                f"Applied index {entry['index']}"
            )

        print(
            "✅ Sync Complete"
        )

    except Exception as e:

        print(
            f"Sync Failed: {e}"
        )