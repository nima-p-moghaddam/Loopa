from datetime import timedelta

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from authentication.tasks import cleanup_expired_tokens
from posts.models import Story
from posts.tasks import send_subscription_email, cleanup_expired_stories
from users.models import BaseUser


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class SendSubscriptionEmailTaskTests(TestCase):

    def test_send_email_success(self):
        result = send_subscription_email(
            subscriber_email="a@test.com",
            target_email="b@test.com",
        )

        self.assertEqual(result, "Email sent to b@test.com")
        self.assertEqual(len(mail.outbox), 1)

        sent_email = mail.outbox[0]
        self.assertEqual(sent_email.subject, "New subscription")
        self.assertEqual(sent_email.to, ["b@test.com"])
        self.assertIn("a@test.com", sent_email.body)
        self.assertIn("b@test.com", sent_email.body)


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class CleanupExpiredTokensTaskTests(TestCase):

    def setUp(self):
        self.user = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )

    def test_cleanup_removes_expired(self):
        OutstandingToken.objects.create(
            user=self.user,
            jti="old-token",
            token="fake",
            created_at=timezone.now() - timedelta(days=10),
            expires_at=timezone.now() - timedelta(days=1),
        )

        result = cleanup_expired_tokens()

        self.assertEqual(result, 1)
        self.assertEqual(
            OutstandingToken.objects.filter(jti="old-token").count(),
            0,
        )

    def test_cleanup_keeps_valid(self):
        OutstandingToken.objects.create(
            user=self.user,
            jti="fresh-token",
            token="fake",
            created_at=timezone.now(),
            expires_at=timezone.now() + timedelta(days=7),
        )

        result = cleanup_expired_tokens()

        self.assertEqual(result, 0)
        self.assertEqual(
            OutstandingToken.objects.filter(jti="fresh-token").count(),
            1,
        )


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class CleanupExpiredStoriesTaskTests(TestCase):

    def setUp(self):
        self.user = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )

    def test_cleanup_removes_expired(self):
        Story.objects.create(
            author=self.user,
            text="Old",
            expires_at=timezone.now() - timedelta(hours=1),
        )

        result = cleanup_expired_stories()

        self.assertEqual(result, 1)
        self.assertEqual(Story.objects.count(), 0)

    def test_cleanup_keeps_active(self):
        Story.objects.create(
            author=self.user,
            text="Active",
            expires_at=timezone.now() + timedelta(hours=24),
        )

        result = cleanup_expired_stories()

        self.assertEqual(result, 0)
        self.assertEqual(Story.objects.count(), 1)