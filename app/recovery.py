from app.log_manager import get_logs
from app.store import store
from app.snapshot_manager import load_snapshot

def recover_state():
    load_snapshot()
    
    print("SnapShot Recovered")
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