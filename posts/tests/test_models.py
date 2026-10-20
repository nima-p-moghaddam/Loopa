from django.core.exceptions import ValidationError
from django.test import TestCase

from posts.models import Subscription
from users.models import BaseUser


class SubscriptionModelTests(TestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )

    def test_clean_raises_when_subscribing_self(self):
        subscription = Subscription(
            subscriber=self.user_a,
            target=self.user_a,
        )

        with self.assertRaises(ValidationError):
            subscription.full_clean()

    def test_clean_ok_when_subscribing_other(self):
        subscription = Subscription(
            subscriber=self.user_a,
            target=self.user_b,
        )

        # نباید خطا بده
        subscription.full_clean()

    def test_unique_together_raises_on_duplicate(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )

        duplicate = Subscription(
            subscriber=self.user_a,
            target=self.user_b,
        )

        with self.assertRaises(ValidationError):
            duplicate.full_clean()
