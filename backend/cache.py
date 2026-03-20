import redis
import json

# 🔥 configure redis (make sure Redis server is running)
redis_client = redis.Redis(
    host="localhost",
    port=6379,
    db=0,
    decode_responses=True
)


def get_cache(key: str):
    try:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
    except Exception as e:
        print("CACHE GET ERROR:", str(e))
    return None


def set_cache(key: str, value, ttl: int = 3600):
    try:
        redis_client.setex(key, ttl, json.dumps(value))
    except Exception as e:
        print("CACHE SET ERROR:", str(e))