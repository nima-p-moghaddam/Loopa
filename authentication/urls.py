from django.urls import path, include
from rest_framework_simplejwt.views import TokenVerifyView

from authentication.apis import (
    SafeTokenRefreshView,
    ThrottledTokenObtainPairView,
)

urlpatterns = [
    path("jwt/", include(([
        path("login/", ThrottledTokenObtainPairView.as_view(), name="login"),
        path("refresh/", SafeTokenRefreshView.as_view(), name="refresh"),
        path("verify/", TokenVerifyView.as_view(), name="verify"),
    ], "jwt"))),
]