# EVENTS = []


# def add_event(message):

#     EVENTS.append(message)

#     if len(EVENTS) > 100:

#         EVENTS.pop(0)


# def get_events():

#     return EVENTS[-20:]


from datetime import datetime
from collections import deque

# ==========================================
#  EVENT STORE
#  Keeps the latest 100 events in memory.
#  Thread-safe for single-process use.
# ==========================================

_events = deque(maxlen=100)

# Global counters
heartbeat_count  = 0
election_count   = 0


def add_event(message: str):
    """Record a new cluster event with a timestamp."""
    entry = {
        "time":    datetime.now().strftime("%H:%M:%S"),
        "message": message
    }
    _events.appendleft(entry)   # newest first


def get_events() -> list:
    """Return all stored events (newest first)."""
    return list(_events)


def increment_heartbeat():
    """Increment the heartbeat counter and log the event."""
    global heartbeat_count
    heartbeat_count += 1
    add_event("💓 Heartbeat Sent")


def increment_election():
    """Increment the election counter and log the event."""
    global election_count
    election_count += 1
    add_event("🗳️ Election Started")


def get_counters() -> dict:
    """Return live counter values for the dashboard."""
    return {
        "heartbeats": heartbeat_count,
        "elections":  election_count
    }