from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication


class LastSeenJWTAuthentication(JWTAuthentication):
    """
    JWTAuthentication که بعد از احراز هویت موفق، last_seen کاربر رو آپدیت می‌کنه.
    با cache throttle — هر ۲ دقیقه یه بار write می‌کنه، نه هر request.
    """
    THROTTLE_SECONDS = 120

    def authenticate(self, request):
        result = super().authenticate(request)

        if result is not None:
            user, _ = result
            self._update_last_seen(user)

        return result

    def _update_last_seen(self, user):
        key = f"last_seen_throttle:{user.id}"
        if cache.get(key):
            return

        User = user.__class__
        User.objects.filter(id=user.id).update(last_seen=timezone.now())
        cache.set(key, True, timeout=self.THROTTLE_SECONDS)