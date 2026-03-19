from time import time

RATE_LIMIT = {}
WINDOW = 60  # seconds
MAX_REQUESTS = 5


def check_rate_limit(ip: str):

    now = time()

    if ip not in RATE_LIMIT:
        RATE_LIMIT[ip] = []

    RATE_LIMIT[ip] = [
        t for t in RATE_LIMIT[ip] if now - t < WINDOW
    ]

    if len(RATE_LIMIT[ip]) >= MAX_REQUESTS:
        return False

    RATE_LIMIT[ip].append(now)
    return True