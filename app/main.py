from fastapi import FastAPI
from datetime import datetime

from app.store import store
from app.cluster import is_leader

from app.heartbeat import (
    start_heartbeat,
    configure_followers
)
from app.recovery import recover_state
from app.election import start_election_monitor

from app.replication import (
    replicate_set,
    replicate_log,
    replicate_commit
)

from app.log_manager import (
    get_logs,
    append_log,
    commit_log,
    save_log_entry
)

import app.raft_state as raft
from fastapi.responses import FileResponse
from fastapi import Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles



app = FastAPI()
templates = Jinja2Templates(
    directory="templates"
)

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)
recover_state()

# ==========================
# Startup Event
# ==========================

@app.on_event("startup")
def startup_event():

    print("Starting Node...")

    if is_leader():

        print("Leader Node Started")

        configure_followers([
            "http://127.0.0.1:8001",
            "http://127.0.0.1:8002"
        ])

        start_heartbeat()

    else:

        print("Follower Node Started")

        start_election_monitor()


# ==========================
# Home
# ==========================

@app.get("/")
def home():

    return {
        "message": "Distributed KV Store Running"
    }


# ==========================
# SET
# ==========================

@app.post("/set")
def set_value(key: str, value: str):

    if not is_leader():

        return {
            "error": "Only leader can accept writes"
        }

    entry = append_log(
        "SET",
        key,
        value
    )

    acks = replicate_log(entry)
    print(f"ACKs received: {acks}")
    print(f"Committing index: {entry['index']}")

    print(
        f"ACKs received: {acks}"
    )

    if acks >= 2:

        commit_log(
        entry["index"]
        )

        raft.commit_index = entry["index"]

        replicate_commit(
            entry["index"]
        )
        store.set(
            key,
            value
        )

        replicate_set(
            key,
            value
        )

    else:

        return {
            "error": "Majority ACK not reached"
        }

    return {
        "status": "success",
        "key": key,
        "value": value
    }

# ==========================
# GET
# ==========================

@app.get("/get/{key}")
def get_value(key: str):

    value = store.get(key)

    if value is None:

        return {
            "error": "Key not found"
        }

    return {
        "key": key,
        "value": value
    }


# ==========================
# DELETE
# ==========================

@app.delete("/delete/{key}")
def delete_value(key: str):

    deleted = store.delete(key)

    if not deleted:

        return {
            "error": "Key not found"
        }

    return {
        "status": "deleted",
        "key": key
    }


# ==========================
# REPLICATION
# ==========================

@app.post("/replicate")
def replicate(key: str, value: str):

    store.set(key, value)

    return {
        "status": "replicated"
    }


# ==========================
# HEARTBEAT
# ==========================

@app.get("/heartbeat")
def heartbeat():

    import app.heartbeat as hb

    hb.last_heartbeat = datetime.now()

    raft.voted_for = None

    return {
        "status": "alive"
    }


# ==========================
# STATUS
# ==========================

@app.get("/status")
def status():

    return {
        "leader": is_leader()
    }


# ==========================
# REQUEST VOTE
# ==========================

@app.post("/request_vote")
def request_vote(candidate_id: str):

    if raft.voted_for is None:

        raft.voted_for = candidate_id

        return {
            "vote_granted": True
        }

    return {
        "vote_granted": False
    }


# ==========================
# LEADER INFO
# ==========================

@app.get("/leader")
def leader():

    return {
        "leader": raft.current_leader,
        "role": raft.current_role
    }
    
@app.get("/logs")
def logs():

    return get_logs()
@app.post("/replicate_log")
def receive_log(entry: dict):

    save_log_entry(entry)

    return {
        "status": "log replicated"
    }
    
@app.post("/commit_log")
def receive_commit(index: int):

    commit_log(index)

    return {
        "status": "committed"
    }
    
@app.get("/commit_index")
def get_commit_index():

    return {
        "commit_index": raft.commit_index
    }
    
    
@app.get("/recover")
def recover():

    recover_state()

    return {
        "status": "recovered"
    }
    


@app.get("/dashboard")
def dashboard():

    return FileResponse(
        "static/dashboard.html"
    )