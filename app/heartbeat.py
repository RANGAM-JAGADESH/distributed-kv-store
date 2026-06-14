import threading
import time
import requests
from datetime import datetime

FOLLOWERS = []

last_heartbeat = datetime.now()


def configure_followers(followers):

    global FOLLOWERS

    FOLLOWERS = followers


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