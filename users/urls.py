from django.urls import path

from users.apis import (
    ChangePasswordAPI,  # ← جدید
    CheckPageNameAPI,
    ProfileAPI,
    PasswordResetConfirmAPI,  # ← جدید
    PasswordResetRequestAPI,  # ← جدید
    ProfileByPageNameAPI,
    RegisterAPI,
    SearchUsersAPI,
    SuggestedUsersAPI,
    UserFollowersAPI,  # ← جدید
    UserFollowingAPI,  # ← جدید
    EmailVerificationConfirmAPI,  # ← جدید
    EmailVerificationResendAPI,  # ← جدید
)

urlpatterns = [
    # ---------- Auth ----------
    path("register/", RegisterAPI.as_view(), name="register"),
    path(
        "check-page-name/",
        CheckPageNameAPI.as_view(),
        name="check-page-name",
    ),

    # ---------- Search & Suggested ----------
    path("search/", SearchUsersAPI.as_view(), name="search-users"),
    path("suggested/", SuggestedUsersAPI.as_view(), name="suggested-users"),

    # ---------- Followers / Following ----------
    path(
        "<int:user_id>/followers/",
        UserFollowersAPI.as_view(),
        name="user-followers",
    ),
    path(
        "<int:user_id>/following/",
        UserFollowingAPI.as_view(),
        name="user-following",
    ),

    # ---------- Profiles ----------
    path(
        "by-page-name/<str:page_name>/profile/",
        ProfileByPageNameAPI.as_view(),
        name="profile-by-page-name",
    ),
    path(
        "<int:user_id>/profile/",
        ProfileAPI.as_view(),
        name="profile",
    ),
    path(
        "change-password/",
        ChangePasswordAPI.as_view(),
        name="change-password",
    ),  # ← جدید

    # ---------- Password Reset ----------
    path(
        "password-reset/",
        PasswordResetRequestAPI.as_view(),
        name="password-reset",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmAPI.as_view(),
        name="password-reset-confirm",
    ),
    # ---------- Email Verification ----------
    path(
        "verify-email/confirm/",
        EmailVerificationConfirmAPI.as_view(),
        name="email-verify-confirm",
    ),
    path(
        "verify-email/resend/",
        EmailVerificationResendAPI.as_view(),
        name="email-verify-resend",
    ),
]
