from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.contrib.auth.models import PermissionsMixin
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager as BUM
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel

# ---------- Validators ----------

page_name_validator = RegexValidator(
    regex=r"^[a-z0-9_][a-z0-9_.]{1,28}[a-z0-9_]$",
    message=(
        "page_name must be 3-30 characters: "
        "lowercase letters, numbers, underscore, or dot. "
        "It cannot start or end with a dot."
    ),
)

RESERVED_PAGE_NAMES = {
    # Frontend routes
    "feed", "explore", "login", "register", "messages",
    "saved", "stories", "search", "settings", "u",
    "onboarding", "profile", "logout", "signup", "signin",
    # Backend / API
    "api", "admin", "auth", "users", "posts",
    # System / generic
    "me", "self", "null", "undefined", "root", "system",
    "support", "help", "about", "privacy", "terms",
    "static", "media", "public", "private",
    # Profile sub-routes        ← جدید
    "followers", "following",
}


# ---------- Managers ----------

class BaseUserManager(BUM):

    def create_user(
            self,
            email,
            is_active=True,
            is_admin=False,
            password=None
    ):
        if not email:
            raise ValueError("Users must have an email address")

        normalized_email = self.normalize_email(email.lower())

        user = self.model(
            email=normalized_email,
            username=normalized_email,
            is_active=is_active,
            is_admin=is_admin
        )

        if password is not None:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.full_clean()
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None):
        user = self.create_user(
            email=email,
            is_active=True,
            is_admin=True,
            password=password
        )

        user.is_superuser = True
        user.save(using=self._db)

        return user


# ---------- Models ----------

class BaseUser(BaseModel, AbstractBaseUser, PermissionsMixin):
    username_validator = UnicodeUsernameValidator()

    username = models.CharField(
        ("Username"),
        max_length=150,
        unique=True,
        help_text=(
            "Required. 150 characters or fewer letters. digits and @/./+/-/_ only.",
        ),
        validators=[username_validator],
        error_messages={
            "unique": ("A users with that username already exists.")
        }
    )
    email = models.EmailField(
        verbose_name="Email",
        max_length=254,
        unique=True,                                    # ← مهم
    )

    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)  # ← جدید

    last_seen = models.DateTimeField(                   # ← جدید
        null=True,
        blank=True,
        db_index=True,
    )

    objects = BaseUserManager()
    USERNAME_FIELD = "email"

    @property
    def is_online(self) -> bool:
        """آیا کاربر توی ۵ دقیقه‌ی اخیر فعال بوده؟"""
        if not self.last_seen:
            return False
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() - self.last_seen < timedelta(minutes=5)

    def __str__(self):
        return self.email

    @property
    def is_staff(self):
        return self.is_admin


class Profile(models.Model):
    user = models.OneToOneField(BaseUser, on_delete=models.CASCADE)

    avatar = models.ImageField(  # ← جدید
        upload_to="avatars/%Y/%m/",
        null=True,
        blank=True,
    )
    page_name = models.CharField(...)

    page_name = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
        validators=[page_name_validator],
    )
    full_name = models.CharField(
        max_length=100,
        null=True,
        blank=True,
    )
    bio = models.TextField(max_length=1000, blank=True, null=True)

    posts_count = models.IntegerField(default=0)
    subscriber_count = models.IntegerField(default=0)
    subscription_count = models.IntegerField(default=0)

    def clean(self):
        super().clean()

        if self.page_name:
            self.page_name = self.page_name.lower().strip()

            if self.page_name in RESERVED_PAGE_NAMES:
                raise ValidationError(
                    {"page_name": f"'{self.page_name}' is a reserved name."}
                )

            if ".." in self.page_name:
                raise ValidationError(
                    {"page_name": "page_name cannot contain two consecutive dots."}
                )

    def save(self, *args, **kwargs):
        if self.page_name:
            self.page_name = self.page_name.lower().strip()
        if self.full_name:
            self.full_name = self.full_name.strip()
        super().save(*args, **kwargs)

    @property
    def is_onboarded(self) -> bool:
        """True if the user has chosen a page_name."""
        return self.page_name is not None

    def __str__(self):
        return f"{self.user} >> @{self.page_name or 'unnamed'}"
