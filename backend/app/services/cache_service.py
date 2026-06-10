# services/cache_service.py — Phase 4: In-memory caching (Redis-ready)
import time, logging
logger = logging.getLogger(__name__)
_cache: dict = {}
TTL_SHORT = 30; TTL_MEDIUM = 120; TTL_LONG = 300

def cache_get(key: str):
    entry = _cache.get(key)
    if not entry: return None
    if time.time() > entry["expires_at"]:
        del _cache[key]; return None
    return entry["value"]

def cache_set(key: str, value, ttl: int = TTL_MEDIUM):
    _cache[key] = {"value": value, "expires_at": time.time() + ttl}

def cache_invalidate(key: str):
    _cache.pop(key, None)

def cache_invalidate_prefix(prefix: str):
    keys = [k for k in _cache if k.startswith(prefix)]
    for k in keys: del _cache[k]

def get_cache_stats() -> dict:
    now = time.time()
    valid = sum(1 for v in _cache.values() if v["expires_at"] > now)
    return {"total_keys": len(_cache), "valid_keys": valid}
