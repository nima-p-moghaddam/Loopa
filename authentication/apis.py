from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from users.models import Profile

BaseUser = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Accepts either `email` or `page_name` as identifier.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # ۱. اول فیلد پیش‌فرض email رو حذف کن
        self.fields.pop(self.username_field, None)

        # ۲. بعد فیلدهای جدید رو اضافه کن
        self.fields["email"] = serializers.EmailField(
            required=False,
            allow_blank=True,
        )
        self.fields["page_name"] = serializers.CharField(
            required=False,
            allow_blank=True,
        )

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip()
        page_name = (attrs.get("page_name") or "").strip()
        password = attrs.get("password")

        if not password:
            raise serializers.ValidationError(
                {"password": ["This field is required."]}
            )

        if email and page_name:
            raise serializers.ValidationError(
                {"detail": "Provide either email or page_name, not both."}
            )

        if not email and not page_name:
            raise serializers.ValidationError(
                {"detail": "Either email or page_name is required."}
            )

        if email:
            try:
                user = BaseUser.objects.get(email=email.lower())
            except BaseUser.DoesNotExist:
                raise AuthenticationFailed(
                    "No active account found with the given credentials."
                )
        else:
            try:
                profile = (
                    Profile.objects
                    .select_related("user")
                    .get(page_name=page_name.lower())
                )
                user = profile.user
            except Profile.DoesNotExist:
                raise AuthenticationFailed(
                    "No active account found with the given credentials."
                )

        if not user.check_password(password):
            raise AuthenticationFailed(
                "No active account found with the given credentials."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "User account is disabled."}
            )

        refresh = self.get_token(user)

        page_name_value = getattr(user.profile, "page_name", None)
        if page_name_value:
            refresh["page_name"] = page_name_value
            refresh.access_token["page_name"] = page_name_value

        # ← جدید
        refresh["is_email_verified"] = user.is_email_verified
        refresh.access_token["is_email_verified"] = user.is_email_verified

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

class ThrottledTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class SafeTokenRefreshView(TokenRefreshView):
    """
    TokenRefreshView که وقتی کاربر حذف شده، 401 میده (نه 500).
    """

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except BaseUser.DoesNotExist:
            return Response(
                {"detail": "User no longer exists."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except (TokenError, InvalidToken) as ex:
            return Response(
                {"detail": str(ex)},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(serializer.validated_data, status=status.HTTP_200_OK)
