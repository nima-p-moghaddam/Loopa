from django.core.exceptions import ValidationError
from django.test import TestCase

from posts.models import Block, Subscription
from services.blocks import (
    create_block,
    delete_block,
    get_blocked_user_ids,
    is_blocked,
)
from services.subscriptions import create_subscription
from users.models import BaseUser


class BlockServiceTests(TestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )

    def test_create_block_success(self):
        block = create_block(blocker=self.user_a, blocked=self.user_b)

        self.assertEqual(block.blocker, self.user_a)
        self.assertEqual(block.blocked, self.user_b)
        self.assertEqual(Block.objects.count(), 1)

    def test_create_block_self_raises(self):
        with self.assertRaises(ValidationError):
            create_block(blocker=self.user_a, blocked=self.user_a)

        self.assertEqual(Block.objects.count(), 0)

    def test_create_block_duplicate_raises(self):
        create_block(blocker=self.user_a, blocked=self.user_b)

        with self.assertRaises(ValidationError):
            create_block(blocker=self.user_a, blocked=self.user_b)

        self.assertEqual(Block.objects.count(), 1)

    def test_delete_block(self):
        block = create_block(blocker=self.user_a, blocked=self.user_b)
        delete_block(block)

        self.assertEqual(Block.objects.count(), 0)

    def test_is_blocked_true(self):
        create_block(blocker=self.user_a, blocked=self.user_b)

        self.assertTrue(is_blocked(self.user_a, self.user_b))
        self.assertTrue(is_blocked(self.user_b, self.user_a))  # ← دوطرفه

    def test_is_blocked_false(self):
        self.assertFalse(is_blocked(self.user_a, self.user_b))

    def test_get_blocked_user_ids(self):
        create_block(blocker=self.user_a, blocked=self.user_b)

        blocked_ids = get_blocked_user_ids(self.user_a)

        self.assertIn(self.user_b.id, blocked_ids)
        self.assertNotIn(self.user_a.id, blocked_ids)  # خودش نباید باشه

    def test_get_blocked_user_ids_bidirectional(self):
        create_block(blocker=self.user_a, blocked=self.user_b)

        # از دید B، A هم بلاک‌شده محسوب می‌شه
        blocked_ids_b = get_blocked_user_ids(self.user_b)
        self.assertIn(self.user_a.id, blocked_ids_b)

    def test_block_cancels_subscription(self):
        # A به B subscribe می‌کنه
        create_subscription(subscriber=self.user_a, target=self.user_b)
        self.assertEqual(Subscription.objects.count(), 1)

        # A، B رو بلاک می‌کنه
        create_block(blocker=self.user_a, blocked=self.user_b)

        # subscription باید لغو بشه
        self.assertEqual(Subscription.objects.count(), 0)

        # Profile counts هم آپدیت بشن
        self.user_a.profile.refresh_from_db()
        self.user_b.profile.refresh_from_db()
        self.assertEqual(self.user_a.profile.subscription_count, 0)
        self.assertEqual(self.user_b.profile.subscriber_count, 0)

    def test_subscribe_after_block_raises(self):
        create_block(blocker=self.user_a, blocked=self.user_b)

        with self.assertRaises(ValidationError):
            create_subscription(subscriber=self.user_a, target=self.user_b)

    def test_subscribe_reverse_after_block_raises(self):
        create_block(blocker=self.user_a, blocked=self.user_b)

        with self.assertRaises(ValidationError):
            create_subscription(subscriber=self.user_b, target=self.user_a)