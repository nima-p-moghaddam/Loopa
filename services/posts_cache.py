import hashlib

from django.core.cache import cache

CACHE_KEY_PREFIX = "posts_list"
CACHE_TIMEOUT = 300  # 5 minutes
VERSION_KEY = "posts_list_version"


def _get_version() -> int:
    version = cache.get(VERSION_KEY)
    if version is None:
        version = 1
        cache.set(VERSION_KEY, version, timeout=None)
    return version


def _bump_version() -> None:
    try:
        cache.incr(VERSION_KEY)
    except ValueError:
        # Key doesn't exist yet
        cache.set(VERSION_KEY, 2, timeout=None)


def make_posts_list_cache_key(
    filters: dict,
    user_id: int | None = None,
) -> str:
    relevant_keys = (
        "search",
        "title",
        "content",
        "slug",
        "page",
        "page_size",
    )

    parts = []
    for key in relevant_keys:
        value = filters.get(key)
        if value is None:
            continue

        if isinstance(value, (list, tuple)):
            value = value[0]

        parts.append(f"{key}={value}")

    if user_id is not None:
        parts.append(f"user={user_id}")

    raw = "&".join(parts) or "all"

    digest = hashlib.md5(raw.encode("utf-8")).hexdigest()

    version = _get_version()

    return f"{CACHE_KEY_PREFIX}:v{version}:{digest}"


def get_cached_posts_list(filters: dict, user_id: int | None = None):
    key = make_posts_list_cache_key(filters, user_id)
    return cache.get(key)


def set_cached_posts_list(
    filters: dict,
    data,
    user_id: int | None = None,
    timeout: int = CACHE_TIMEOUT,
) -> None:
    key = make_posts_list_cache_key(filters, user_id)
    cache.set(key, data, timeout=timeout)


def invalidate_posts_list_cache() -> None:
    _bump_version()