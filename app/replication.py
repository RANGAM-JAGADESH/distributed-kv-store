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
        
def replicate_log(entry):

    acknowledgements = 1

    for node in REPLICA_NODES:

        try:

            response = requests.post(
                f"{node}/replicate_log",
                json=entry
            )

            if response.status_code == 200:

                acknowledgements += 1

        except:
            pass

    return acknowledgements


def replicate_commit(index):

    for node in REPLICA_NODES:

        try:

            requests.post(
                f"{node}/commit_log",
                params={
                    "index": index
                }
            )

        except:
            pass