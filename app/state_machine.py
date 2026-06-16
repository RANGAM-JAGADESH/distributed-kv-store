from app.log_manager import get_logs
from app.store import store


from app.log_manager import get_logs
from app.store import store
import app.raft_state as raft


def recover_state_machine():

    logs = get_logs()

    recovered = 0
    last_commit = 0

    for log in logs:

        if log.get("committed", False):

            if log["operation"] == "SET":

                store.set(
                    log["key"],
                    log["value"]
                )

                recovered += 1

                last_commit = log["index"]

    raft.commit_index = last_commit

    print(
        f"✅ Recovered {recovered} committed logs"
    )

    print(
        f"✅ Commit Index = {last_commit}"
    )