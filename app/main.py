from fastapi import FastAPI
from app.store import store
from app.replication import replicate_set
from app.cluster import is_leader
from app.heartbeat import start_heartbeat
from datetime import datetime
last_heartbeat = datetime.now()
app = FastAPI()
if is_leader():
    start_heartbeat()

@app.get("/")
def home():
    return {"message": "Distributed KV Store Running"}




@app.post("/set")
def set_value(key: str, value: str):

    if not is_leader():
        return {
            "error": "Only leader can accept writes"
        }

    store.set(key, value)
    replicate_set(key, value)

    return {
        "status": "success",
        "key": key,
        "value": value
    }


@app.get("/get/{key}")
def get_value(key: str):
    value = store.get(key)

    if value is None:
        return {"error": "Key not found"}

    return {
        "key": key,
        "value": value
    }


@app.delete("/delete/{key}")
def delete_value(key: str):
    deleted = store.delete(key)

    if not deleted:
        return {"error": "Key not found"}

    return {
        "status": "deleted",
        "key": key
    }
    
    
@app.post("/replicate")
def replicate(key: str, value: str):

    store.set(key, value)

    return {
        "status": "replicated"
    }
    
@app.get("/heartbeat")
def heartbeat():

    global last_heartbeat

    last_heartbeat = datetime.now()

    return {
        "status": "alive"
    }
    
@app.get("/status")
def status():

    return {
        "leader": is_leader()
    }
