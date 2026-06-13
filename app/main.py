from fastapi import FastAPI
from app.store import store
from app.replication import replicate_set

app = FastAPI()


@app.get("/")
def home():
    return {"message": "Distributed KV Store Running"}


@app.post("/set")
def set_value(key: str, value: str):
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