from app.snapshot_manager import (
    create_snapshot,
    load_snapshot,
    truncate_logs
)



from app.state_machine import recover_state_machine
from fastapi import FastAPI
from datetime import datetime

from app.store import store
from app.cluster import is_leader
import app.raft_state as raft
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

from app.event_manager import (
    add_event,
    get_events,
    get_counters,
    increment_heartbeat,
    increment_election
)

from app.snapshot_manager import (
    create_snapshot,
    load_snapshot
)

from fastapi.responses import FileResponse

from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)

recover_state()

raft.load_raft_state()

load_snapshot()

recover_state_machine()
add_event("🔄 Recovery Started")


# ==========================
# Startup
# ==========================

@app.on_event("startup")
def startup_event():

    print("Starting Node...")

    if is_leader():

        raft.current_role = "leader"

        raft.current_leader = "node1"

        raft.save_raft_state()

        print("Leader Node Started")

        configure_followers([
            "http://127.0.0.1:8001",
            "http://127.0.0.1:8002"
        ])

        start_heartbeat()

    else:

        raft.current_role = "follower"

        raft.save_raft_state()

        print("Follower Node Started")

        start_election_monitor()


# ==========================
# Home
# ==========================

@app.get("/")
def home():
    return {"message": "Distributed KV Store Running"}


# ==========================
# SET
# ==========================

@app.post("/set")
def set_value(key: str, value: str):

    if not is_leader():
        return {"error": "Only leader can accept writes"}

    entry = append_log("SET", key, value)

    acks = replicate_log(entry)
    add_event(f"📦 Log Replicated  (key={key})")

    print(f"ACKs received: {acks}")
    print(f"Committing index: {entry['index']}")

    if acks >= 2:

        commit_log(entry["index"])
        raft.commit_index = entry["index"]
        raft.save_raft_state()

        replicate_commit(entry["index"])
        store.set(key, value)
        replicate_set(key, value)

        add_event(f"✅ Log Committed  (index={entry['index']})")

    else:
        return {"error": "Majority ACK not reached"}

    return {
        "status": "success",
        "key":    key,
        "value":  value
    }


# ==========================
# GET
# ==========================

@app.get("/get/{key}")
def get_value(key: str):

    value = store.get(key)

    if value is None:
        return {"error": "Key not found"}

    return {"key": key, "value": value}


# ==========================
# DELETE
# ==========================

@app.delete("/delete/{key}")
def delete_value(key: str):

    deleted = store.delete(key)

    if not deleted:
        return {"error": "Key not found"}

    return {"status": "deleted", "key": key}


# ==========================
# REPLICATION
# ==========================

@app.post("/replicate")
def replicate(key: str, value: str):

    store.set(key, value)
    return {"status": "replicated"}


# ==========================
# HEARTBEAT
# ==========================

@app.get("/heartbeat")
def heartbeat():

    import app.heartbeat as hb
    hb.last_heartbeat = datetime.now()
    raft.voted_for    = None

    increment_heartbeat()   # counter + event

    return {"status": "alive"}


# ==========================
# STATUS
# ==========================

@app.get("/status")
def status():
    return {"leader": is_leader()}


# ==========================
# REQUEST VOTE
# ==========================

@app.post("/request_vote")
def request_vote(candidate_id: str):

    if raft.voted_for is None:

        raft.voted_for = candidate_id
        increment_election()        # counter + event
        add_event(f"👑 New Leader Elected  ({candidate_id})")

        return {"vote_granted": True}

    return {"vote_granted": False}


# ==========================
# LEADER INFO
# ==========================

@app.get("/leader")
def leader():
    return {
        "leader": raft.current_leader,
        "role":   raft.current_role
    }


# ==========================
# LOGS
# ==========================

@app.get("/logs")
def logs():
    return get_logs()


@app.post("/replicate_log")
def receive_log(entry: dict):

    save_log_entry(entry)
    add_event("📥 Follower Synced")

    return {"status": "log replicated"}


@app.post("/commit_log")
def receive_commit(index: int):

    commit_log(index)
    return {"status": "committed"}


@app.get("/commit_index")
def get_commit_index():
    return {"commit_index": raft.commit_index}


# ==========================
# RECOVER
# ==========================

@app.get("/recover")
def recover():

    recover_state()
    add_event("🔄 Recovery Started")

    return {"status": "recovered"}


# ==========================
# DASHBOARD
# ==========================

@app.get("/dashboard")
def dashboard():
    return FileResponse("static/dashboard.html")


# ==========================
# HEALTH
# ==========================

@app.get("/health")
def health():
    return {
        "status": "online",
        "node":   raft.current_leader
    }


# ==========================
# METRICS
# ==========================

@app.get("/metrics")
def metrics():

    logs      = get_logs()
    committed = len([l for l in logs if l.get("committed")])
    counters  = get_counters()

    return {
        "total_logs":     len(logs),
        "committed_logs": committed,
        "pending_logs":   len(logs) - committed,
        "commit_index":   raft.commit_index,
        "leader":         raft.current_leader,
        "role":           raft.current_role,
        "heartbeats":     counters["heartbeats"],
        "elections":      counters["elections"]
    }


# ==========================
# EVENTS
# ==========================

@app.get("/events")
def events():
    return get_events()


# ==========================
# COUNTERS
# ==========================

@app.get("/counters")
def counters():
    return get_counters()


@app.get("/stats")
def get_stats():

    logs = get_logs()

    committed_logs = len(
        [
            log
            for log in logs
            if log["committed"]
        ]
    )

    pending_logs = len(
        [
            log
            for log in logs
            if not log["committed"]
        ]
    )

    return {

        "term":
        raft.current_term,

        "leader":
        raft.current_leader,

        "role":
        raft.current_role,

        "commit_index":
        raft.commit_index,

        "election_count":
        raft.election_count,

        "leader_changes":
        raft.leader_changes,

        "total_logs":
        len(logs),

        "committed_logs":
        committed_logs,

        "pending_logs":
        pending_logs

    }
    
    


@app.get("/save_state")
def save_state():

    print("SAVE STATE CALLED")

    raft.save_raft_state()

    return {
        "status": "saved"
    }


@app.get("/test123")
def test123():

    return {
        "message": "hello bro"
    }
    
    

    
@app.get("/snapshot")
def snapshot():

    create_snapshot()

    truncate_logs()

    return {
        "status": "snapshot created"
    }