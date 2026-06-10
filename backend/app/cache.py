
import json
try:
    import redis
    redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)
except Exception:
    redis_client = None

def set_cache(key:str, value, expiry:int=300):
    if redis_client:
        redis_client.setex(key, expiry, json.dumps(value))

def get_cache(key:str):
    if redis_client:
        data = redis_client.get(key)
        if data:
            return json.loads(data)
    return None
