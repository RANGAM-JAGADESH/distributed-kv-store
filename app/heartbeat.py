import threading
import time
import requests
from datetime import datetime

last_heartbeat = datetime.now()

FOLLOWERS = [
    "http://127.0.0.1:8001",
    "http://127.0.0.1:8002"
]

def send_heartbeat():

    while True:

        for follower in FOLLOWERS:

            try:
                requests.get(
                    f"{follower}/heartbeat"
                )

            except:
                pass

        time.sleep(2)

def start_heartbeat():

    thread = threading.Thread(
        target=send_heartbeat,
        daemon=True
    )

    thread.start()