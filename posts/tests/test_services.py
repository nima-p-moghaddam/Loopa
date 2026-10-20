from django.test import TestCase
from django.core.exceptions import ValidationError

from posts.models import Subscription
from services.subscriptions import create_subscription
from users.models import BaseUser


class CreateSubscriptionServiceTests(TestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )

    def test_create_subscription_happy_path(self):
        subscription = create_subscription(
            subscriber=self.user_a,
            target=self.user_b,
        )

        self.assertEqual(subscription.subscriber, self.user_a)
        self.assertEqual(subscription.target, self.user_b)
        self.assertIsNotNone(subscription.pk)
        # توی دیتابیس هست
        self.assertTrue(
            Subscription.objects.filter(pk=subscription.pk).exists()
        )

    def test_create_subscription_self_raises(self):
        with self.assertRaises(ValidationError):
            create_subscription(
                subscriber=self.user_a,
                target=self.user_a,
            )

        # مهم: نباید توی دیتابیس چیزی ساخته شده باشه
        self.assertEqual(Subscription.objects.count(), 0)

    def test_create_subscription_duplicate_raises(self):
        create_subscription(
            subscriber=self.user_a,
            target=self.user_b,
        )

        with self.assertRaises(ValidationError):
            create_subscription(
                subscriber=self.user_a,
                target=self.user_b,
            )

        # فقط یکی توی دیتابیس
        self.assertEqual(Subscription.objects.count(), 1)
