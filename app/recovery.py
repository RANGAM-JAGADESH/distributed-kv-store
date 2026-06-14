from app.log_manager import get_logs
from app.store import store


def recover_state():

    logs = get_logs()

    for log in logs:

        if log.get("committed"):

            if log["operation"] == "SET":

                store.set(
                    log["key"],
                    log["value"]
                )

    print(
        f"Recovered {len(logs)} log entries"
    )