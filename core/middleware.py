from django.core.cache import cache
from django.utils import timezone


class LastSeenMiddleware:
    """
    آخرین زمان فعالیت کاربر رو توی DB ذخیره می‌کنه.
    با cache throttle — هر ۲ دقیقه یه بار write می‌کنه، نه هر request.
    """
    THROTTLE_SECONDS = 120

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)

        if user and user.is_authenticated:
            key = f"last_seen_throttle:{user.id}"

            if not cache.get(key):
                User = user.__class__
                User.objects.filter(id=user.id).update(
                    last_seen=timezone.now()
                )
                cache.set(key, True, timeout=self.THROTTLE_SECONDS)

        return self.get_response(request)