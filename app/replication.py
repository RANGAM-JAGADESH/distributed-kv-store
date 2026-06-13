import requests

REPLICA_NODES = [
    "http://127.0.0.1:8001",
    "http://127.0.0.1:8002"
]


def replicate_set(key, value):

    for node in REPLICA_NODES:
        try:
            requests.post(
                f"{node}/replicate",
                params={
                    "key": key,
                    "value": value
                }
            )
        except:
            pass