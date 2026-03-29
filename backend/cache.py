cache_store = {}

def get_cache(key: str):
    return cache_store.get(key)

def set_cache(key: str, value, ttl: int = 3600):
    cache_store[key] = value