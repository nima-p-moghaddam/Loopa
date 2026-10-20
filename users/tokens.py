from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """
    Token generator برای تایید ایمیل.
    جداست از password reset — نمی‌شه tokenها رو با هم عوض کرد.
    """
    key_salt = "loop-user-email-verification"

    def _make_hash_value(self, user, timestamp):
        # اگه email یا is_email_verified عوض بشه، token باطل می‌شه
        return (
            str(user.pk)
            + str(timestamp)
            + str(user.email)
            + str(user.is_email_verified)
        )


email_verification_token = EmailVerificationTokenGenerator()