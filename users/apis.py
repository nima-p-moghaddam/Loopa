from django.core.exceptions import (
    ObjectDoesNotExist,
    ValidationError as DjangoValidationError,
)
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError as DRFValidationError,
)
from rest_framework.permissions import (
    IsAuthenticated,  # ← برای ChangePasswordAPI
    IsAuthenticatedOrReadOnly,  # ← برای ProfileAPI
)
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from posts.models import Subscription
from query_selectors.profiles import (
    get_followers,
    get_following,
    get_profile,
    get_profile_by_page_name,
    get_suggested_users,
    search_users,
)
from services.profiles import update_profile
from services.users import change_password, register_user
from users.models import (
    BaseUser,
    Profile,
    RESERVED_PAGE_NAMES,
    page_name_validator,
)
from users.tokens import email_verification_token
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
import logging

logger = logging.getLogger(__name__)


# ============================================================
# Register
# ============================================================
def _send_verification_email(user):
    """helper: ارسال ایمیل تایید به کاربر."""
    from django.conf import settings
    from django.core.mail import send_mail
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode
    import logging

    logger = logging.getLogger(__name__)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token.make_token(user)

    frontend_url = getattr(
        settings, "FRONTEND_URL", "http://localhost:3000"
    )
    verify_url = f"{frontend_url}/verify-email/{uid}/{token}"

    subject = "ایمیلت رو تایید کن — Loopa"
    message = (
        f"سلام،\n\n"
        f"به Loopa خوش اومدی! برای فعال‌سازی کامل حسابت روی لینک زیر بزن:\n\n"
        f"{verify_url}\n\n"
        f"اگه این درخواست از طرف تو نبوده، نادیده بگیر."
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception(
            "Failed to send verification email to %s", user.email
        )


class RegisterAPI(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"
    permission_classes = []  # public

    class InputRegisterSerializer(serializers.Serializer):
        email = serializers.EmailField(max_length=255)
        page_name = serializers.CharField(
            max_length=30,
            min_length=3,
            validators=[page_name_validator],
        )
        full_name = serializers.CharField(
            max_length=100,
            required=False,
            allow_blank=True,
            allow_null=True,
        )
        password = serializers.CharField(
            max_length=255,
            min_length=8,
            write_only=True,
        )
        confirm_password = serializers.CharField(
            max_length=255,
            write_only=True,
        )

        class Meta:
            ref_name = "RegisterInput"

        def validate_email(self, email):
            email = email.lower().strip()
            if BaseUser.objects.filter(email=email).exists():
                raise serializers.ValidationError("Email already exists")
            return email

        def validate_page_name(self, value):
            value = value.lower().strip()

            if value in RESERVED_PAGE_NAMES:
                raise serializers.ValidationError(
                    f"'{value}' is a reserved name."
                )

            if ".." in value:
                raise serializers.ValidationError(
                    "page_name cannot contain two consecutive dots."
                )

            if Profile.objects.filter(page_name=value).exists():
                raise serializers.ValidationError(
                    "This page_name is already taken."
                )

            return value

        def validate_full_name(self, value):
            if value is None:
                return value
            return value.strip()

        def validate(self, attrs):
            if attrs["password"] != attrs["confirm_password"]:
                raise serializers.ValidationError(
                    {"confirm_password": "Passwords do not match."}
                )
            return attrs

    class OutputRegisterSerializer(serializers.ModelSerializer):
        page_name = serializers.CharField(
            source="profile.page_name",
            read_only=True,
        )
        full_name = serializers.CharField(
            source="profile.full_name",
            read_only=True,
        )

        class Meta:
            model = BaseUser
            fields = ("email", "page_name", "full_name")
            ref_name = "RegisterOutput"

    @extend_schema(
        request=InputRegisterSerializer,
        responses={201: OutputRegisterSerializer, 400: None},
        description="Register a new user with email, page_name, and password.",
    )
    def post(self, request):
        serializer = self.InputRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = register_user(
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
                page_name=serializer.validated_data["page_name"],
                full_name=serializer.validated_data.get("full_name"),
            )
        except DjangoValidationError as ex:
            raise DRFValidationError(ex.messages)

        # ← ارسال ایمیل تایید
        _send_verification_email(user)

        return Response(
            self.OutputRegisterSerializer(
                user,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# Check page_name availability
# ============================================================

class CheckPageNameAPI(APIView):
    permission_classes = []  # public — برای UX بهتر
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "check_page_name"

    class InputSerializer(serializers.Serializer):
        page_name = serializers.CharField(max_length=30)

        class Meta:
            ref_name = "CheckPageNameInput"

    class OutputSerializer(serializers.Serializer):
        available = serializers.BooleanField()
        reason = serializers.CharField(allow_null=True)

        class Meta:
            ref_name = "CheckPageNameOutput"

    @extend_schema(
        request=InputSerializer,
        responses={200: OutputSerializer},
        description="Check if a page_name is available.",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        value = serializer.validated_data["page_name"].lower().strip()

        if len(value) < 3 or len(value) > 30:
            return Response({"available": False, "reason": "length"})

        try:
            page_name_validator(value)
        except DjangoValidationError:
            return Response({"available": False, "reason": "format"})

        if value in RESERVED_PAGE_NAMES:
            return Response({"available": False, "reason": "reserved"})

        if ".." in value:
            return Response({"available": False, "reason": "format"})

        if Profile.objects.filter(page_name=value).exists():
            return Response({"available": False, "reason": "taken"})

        return Response({"available": True, "reason": None})


# ============================================================
# Profile serializers (shared)
# ============================================================

class ProfileOutputSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    email = serializers.SerializerMethodField()
    is_own = serializers.SerializerMethodField()
    is_subscribed = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    is_email_verified = serializers.SerializerMethodField()    # ← جدید

    class Meta:
        model = Profile
        fields = (
            "user_id", "page_name", "full_name", "email",
            "avatar",
            "is_online",
            "is_email_verified",                                # ← جدید
            "bio", "posts_count", "subscriber_count",
            "subscription_count",
            "is_own", "is_subscribed",
        )
        ref_name = "ProfileOutput"

    def get_is_email_verified(self, obj):
        return obj.user.is_email_verified

    def get_is_online(self, obj):
        return obj.user.is_online

    def get_avatar(self, obj):
        if not obj.avatar:
            return None
        # مسیر نسبی؛ فرانت getMediaUrl رو صدا می‌زنه
        return obj.avatar.url

    def get_email(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            if request.user.id == obj.user_id:
                return obj.user.email
        return None

    def get_is_own(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return request.user.id == obj.user_id

    def get_is_subscribed(self, obj):
        # اگه annotate شده، از اون بخون (بهینه)
        if hasattr(obj, "_is_subscribed"):
            return obj._is_subscribed

        # fallback برای endpointهایی که annotate نکردن
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if request.user.id == obj.user_id:
            return False
        return Subscription.objects.filter(
            subscriber=request.user,
            target=obj.user,
        ).exists()


class ProfileInputSerializer(serializers.Serializer):
    page_name = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
    )
    bio = serializers.CharField(
        max_length=1000,
        allow_blank=True,
        required=False,
    )
    full_name = serializers.CharField(
        max_length=100,
        allow_blank=True,
        required=False,
    )
    avatar = serializers.ImageField(required=False)
    remove_avatar = serializers.BooleanField(required=False)

    class Meta:
        ref_name = "ProfileInput"

    def validate_page_name(self, value):
        value = value.lower().strip()
        if not value:
            return value

        if value in RESERVED_PAGE_NAMES:
            raise serializers.ValidationError(f"'{value}' یک نام رزرو شده است.")

        if ".." in value:
            raise serializers.ValidationError("نام پیج نمی‌تواند دو نقطه پشت سر هم داشته باشد.")

        try:
            page_name_validator(value)
        except DjangoValidationError:
            raise serializers.ValidationError("فرمت نام پیج معتبر نیست.")

        # چک کردن اینکه نام پیج قبلاً توسط کس دیگه ای گرفته نشده باشه
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            if Profile.objects.filter(page_name=value).exclude(user=request.user).exists():
                raise serializers.ValidationError("این نام پیج قبلاً گرفته شده است.")
        else:
            if Profile.objects.filter(page_name=value).exists():
                raise serializers.ValidationError("این نام پیج قبلاً گرفته شده است.")

        return value


# ============================================================
# Profile: by user_id
# ============================================================

class ProfileAPI(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # ← جدید

    @extend_schema(
        responses={200: ProfileOutputSerializer, 404: None},
        description="Get a user's profile by user_id (hidden if blocked).",
    )
    def get(self, request, user_id):
        try:
            profile = get_profile(viewer=request.user, user_id=user_id)
        except ObjectDoesNotExist:
            raise NotFound("Profile not found.")

        serializer = ProfileOutputSerializer(
            profile,
            context={"request": request},
        )
        return Response(serializer.data)

    @extend_schema(
        request=ProfileInputSerializer,
        responses={
            200: ProfileOutputSerializer,
            403: None,
            404: None,
        },
        description="Update your own profile (bio, full_name).",
    )
    def patch(self, request, user_id):
        if request.user.id != user_id:
            raise PermissionDenied("You can only update your own profile.")

        serializer = ProfileInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            profile = get_profile(viewer=request.user, user_id=user_id)
        except ObjectDoesNotExist:
            raise NotFound("Profile not found.")

        # ---------- Avatar ----------
        remove_avatar = serializer.validated_data.get("remove_avatar", False)
        new_avatar = serializer.validated_data.get("avatar")

        if remove_avatar and profile.avatar:
            profile.avatar.delete(save=False)
            profile.avatar = None
            profile.save(update_fields=["avatar"])
        elif new_avatar:
            # پاک کردن فایل قدیمی
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile.avatar = new_avatar
            profile.save(update_fields=["avatar"])

        # ---------- Bio / Full name ----------
        profile = update_profile(
            profile=profile,
            page_name=serializer.validated_data.get("page_name"),  # ← جدید
            bio=serializer.validated_data.get("bio"),
            full_name=serializer.validated_data.get("full_name"),
        )

        return Response(
            ProfileOutputSerializer(
                profile, context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# Profile: by page_name
# ============================================================

class ProfileByPageNameAPI(APIView):
    """
    Get a user's profile by page_name (public URL: /u/<page_name>).
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    @extend_schema(
        responses={200: ProfileOutputSerializer, 404: None},
        description="Get a user's profile by page_name (hidden if blocked).",
    )
    def get(self, request, page_name):
        try:
            profile = get_profile_by_page_name(
                viewer=request.user,
                page_name=page_name,
            )
        except ObjectDoesNotExist:
            raise NotFound("Profile not found.")

        serializer = ProfileOutputSerializer(
            profile,
            context={"request": request},
        )
        return Response(serializer.data)


class SearchUsersAPI(APIView):
    """
    Search users by page_name or full_name.
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    @extend_schema(
        responses={200: ProfileOutputSerializer(many=True)},
        description="Search users by page_name or full_name.",
    )
    def get(self, request):
        query = request.query_params.get("q", "")

        profiles = search_users(viewer=request.user, query=query)

        serializer = ProfileOutputSerializer(
            profiles, many=True, context={"request": request},
        )
        return Response(serializer.data)


class SuggestedUsersAPI(APIView):
    """
    Suggested users to follow for the current user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ProfileOutputSerializer(many=True)},
        description="Get suggested users to follow.",
    )
    def get(self, request):
        profiles = get_suggested_users(viewer=request.user)

        serializer = ProfileOutputSerializer(
            profiles, many=True, context={"request": request},
        )
        return Response(serializer.data)


class UserFollowersAPI(APIView):
    """
    List users who follow a specific user.
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    @extend_schema(
        responses={200: ProfileOutputSerializer(many=True), 404: None},
        description="List followers of a user (respects blocks).",
    )
    def get(self, request, user_id):
        user = BaseUser.objects.filter(id=user_id).first()
        if user is None:
            raise NotFound("User not found.")

        profiles = get_followers(viewer=request.user, user_id=user_id)

        serializer = ProfileOutputSerializer(
            profiles, many=True, context={"request": request},
        )
        return Response(serializer.data)


class UserFollowingAPI(APIView):
    """
    List users that a specific user follows.
    """
    permission_classes = [IsAuthenticatedOrReadOnly]

    @extend_schema(
        responses={200: ProfileOutputSerializer(many=True), 404: None},
        description="List users that a user follows (respects blocks).",
    )
    def get(self, request, user_id):
        user = BaseUser.objects.filter(id=user_id).first()
        if user is None:
            raise NotFound("User not found.")

        profiles = get_following(viewer=request.user, user_id=user_id)

        serializer = ProfileOutputSerializer(
            profiles, many=True, context={"request": request},
        )
        return Response(serializer.data)


class ChangePasswordAPI(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    class InputSerializer(serializers.Serializer):
        current_password = serializers.CharField(
            max_length=255,
            write_only=True,
        )
        new_password = serializers.CharField(
            max_length=255,
            min_length=8,
            write_only=True,
        )
        confirm_password = serializers.CharField(
            max_length=255,
            write_only=True,
        )

        class Meta:
            ref_name = "ChangePasswordInput"

        def validate(self, attrs):
            if attrs["new_password"] != attrs["confirm_password"]:
                raise serializers.ValidationError(
                    {"confirm_password": "رمز عبور جدید و تکرارش یکی نیستن"}
                )
            return attrs

    @extend_schema(
        request=InputSerializer,
        responses={
            200: inline_serializer(
                name="ChangePasswordOutput",
                fields={"detail": serializers.CharField()},
            ),
            400: None,
            401: None,
        },
        description="Change your own password. Requires current password.",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            change_password(
                user=request.user,
                current_password=serializer.validated_data["current_password"],
                new_password=serializer.validated_data["new_password"],
            )
        except DjangoValidationError as ex:
            raise DRFValidationError(ex.messages)

        return Response(
            {"detail": "رمز عبور با موفقیت تغییر کرد"},
            status=status.HTTP_200_OK,
        )


# ============================================================
# Email Verification
# ============================================================

class EmailVerificationConfirmAPI(APIView):
    """تایید ایمیل با uid و token."""
    permission_classes = []

    # بدون throttle — token یه‌بارمصرفه

    class InputSerializer(serializers.Serializer):
        uid = serializers.CharField()
        token = serializers.CharField()

        class Meta:
            ref_name = "EmailVerificationConfirmInput"

    @extend_schema(
        request=InputSerializer,
        responses={
            200: inline_serializer(
                name="EmailVerificationConfirmOutput",
                fields={"detail": serializers.CharField()},
            ),
            400: None,
        },
        description="Confirm email with uid and token.",
    )
    def post(self, request):
        from django.utils.encoding import force_str
        from django.utils.http import urlsafe_base64_decode

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            uid = force_str(
                urlsafe_base64_decode(serializer.validated_data["uid"])
            )
            user = BaseUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, BaseUser.DoesNotExist):
            raise DRFValidationError(
                {"detail": "لینک تایید نامعتبره یا منقضی شده."}
            )

        if user.is_email_verified:
            return Response(
                {"detail": "ایمیلت قبلاً تایید شده بود."},
                status=status.HTTP_200_OK,
            )

        if not email_verification_token.check_token(
                user, serializer.validated_data["token"]
        ):
            raise DRFValidationError(
                {"detail": "لینک تایید نامعتبره یا منقضی شده."}
            )

        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])

        return Response(
            {"detail": "ایمیلت با موفقیت تایید شد."},
            status=status.HTTP_200_OK,
        )


class EmailVerificationResendAPI(APIView):
    """ارسال مجدد ایمیل تایید."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_verification_resend"

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name="EmailVerificationResendOutput",
                fields={"detail": serializers.CharField()},
            ),
            400: None,
        },
        description="Resend verification email to current user.",
    )
    def post(self, request):
        if request.user.is_email_verified:
            raise DRFValidationError(
                {"detail": "ایمیلت قبلاً تایید شده."}
            )

        _send_verification_email(request.user)

        return Response(
            {"detail": "ایمیل تایید دوباره ارسال شد."},
            status=status.HTTP_200_OK,
        )


# ============================================================
# Password Reset
# ============================================================

class PasswordResetRequestAPI(APIView):
    """
    درخواست بازیابی رمز عبور.
    برای جلوگیری از email enumeration، همیشه 200 برمی‌گردونیم.
    """
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset_request"

    class InputSerializer(serializers.Serializer):
        email = serializers.EmailField()

        class Meta:
            ref_name = "PasswordResetRequestInput"

    @extend_schema(
        request=InputSerializer,
        responses={200: inline_serializer(
            name="PasswordResetRequestOutput",
            fields={"detail": serializers.CharField()},
        )},
        description="Request a password reset email.",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()
        user = BaseUser.objects.filter(email=email, is_active=True).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            frontend_url = getattr(
                settings, "FRONTEND_URL", "http://localhost:3000"
            )
            reset_url = f"{frontend_url}/reset-password/{uid}/{token}"

            subject = "بازیابی رمز عبور Loopa"
            message = (
                f"سلام،\n\n"
                f"برای بازیابی رمز عبورت روی لینک زیر بزن:\n\n"
                f"{reset_url}\n\n"
                f"این لینک تا ۱ ساعت معتبره.\n\n"
                f"اگه این درخواست از طرف تو نبوده، نادیده بگیر."
            )

            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception:
                logger.exception(
                    "Failed to send password reset email to %s", email
                )

        return Response(
            {
                "detail": (
                    "اگه این ایمیل توی Loopa ثبت شده باشه، "
                    "لینک بازیابی برات ارسال شد."
                )
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmAPI(APIView):
    """
    تایید reset و تنظیم رمز جدید.
    """
    permission_classes = []

    # بدون throttle — token یه‌بارمصرفه و اسپم فایده‌ای نداره

    class InputSerializer(serializers.Serializer):
        uid = serializers.CharField()
        token = serializers.CharField()
        new_password = serializers.CharField(
            min_length=8,
            write_only=True,
        )
        confirm_password = serializers.CharField(write_only=True)

        class Meta:
            ref_name = "PasswordResetConfirmInput"

        def validate(self, attrs):
            if attrs["new_password"] != attrs["confirm_password"]:
                raise serializers.ValidationError(
                    {"confirm_password": "رمز عبور و تکرارش یکی نیستن"}
                )
            return attrs

    @extend_schema(
        request=InputSerializer,
        responses={
            200: inline_serializer(
                name="PasswordResetConfirmOutput",
                fields={"detail": serializers.CharField()},
            ),
            400: None,
        },
        description="Confirm password reset with token and new password.",
    )
    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # decode uid
        try:
            uid = force_str(
                urlsafe_base64_decode(serializer.validated_data["uid"])
            )
            user = BaseUser.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, BaseUser.DoesNotExist):
            raise DRFValidationError(
                {"detail": "لینک بازیابی نامعتبره یا منقضی شده."}
            )

        # validate token
        if not default_token_generator.check_token(
                user, serializer.validated_data["token"]
        ):
            raise DRFValidationError(
                {"detail": "لینک بازیابی نامعتبره یا منقضی شده."}
            )

        # set new password
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        # invalidate all JWT tokens
        from services.users import _invalidate_all_tokens
        _invalidate_all_tokens(user)

        return Response(
            {
                "detail": (
                    "رمز عبور با موفقیت تغییر کرد. "
                    "حالا می‌تونی با رمز جدید وارد شی."
                )
            },
            status=status.HTTP_200_OK,
        )
