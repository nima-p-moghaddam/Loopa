from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction

from users.models import BaseUser, Profile

User = get_user_model()


@transaction.atomic
def register_user(
        email: str,
        password: str,
        page_name: str,
        full_name: str | None = None,
) -> BaseUser:
    """
    Register a new user with email, password, page_name.

    - Creates BaseUser (signal creates Profile automatically)
    - Sets page_name and full_name on the Profile
    - Wrapped in atomic transaction to avoid partial state
    """
    user = BaseUser.objects.create_user(
        email=email,
        password=password,
    )

    profile = user.profile
    profile.page_name = page_name
    if full_name:
        profile.full_name = full_name
    profile.full_clean()
    profile.save(update_fields=["page_name", "full_name"])

    return user


@transaction.atomic
def change_password(
        user: BaseUser,
        current_password: str,
        new_password: str,
) -> BaseUser:
    """
    Change a user's password.

    - Verifies current_password against the existing hash.
    - Checks new_password is different from current.
    - Invalidates all outstanding JWT tokens (forces re-login everywhere).
    """
    # ۱. current password درست باشه
    if not user.check_password(current_password):
        raise ValidationError(
            {"current_password": "رمز عبور فعلی اشتباهه"}
        )

    # ۲. جدید با فعلی فرق کنه
    if user.check_password(new_password):
        raise ValidationError(
            {"new_password": "رمز عبور جدید باید با فعلی فرق کنه"}
        )

    # ۳. set و save
    user.set_password(new_password)
    user.save(update_fields=["password"])

    # ۴. همه‌ی JWT tokenها رو باطل کن (اختیاری ولی امن)
    _invalidate_all_tokens(user)

    return user


def _invalidate_all_tokens(user: BaseUser) -> None:
    """
    Blacklist all outstanding JWT tokens for a user.
    Silently ignores if token_blacklist isn't installed.
    """
    try:
        from rest_framework_simplejwt.token_blacklist.models import (
            OutstandingToken,
            BlacklistedToken,
        )

        outstanding = OutstandingToken.objects.filter(user=user)
        for token in outstanding:
            BlacklistedToken.objects.get_or_create(token=token)
    except ImportError:
        pass
