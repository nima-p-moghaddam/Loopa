from django.test import TestCase

from posts.models import Post, Subscription
from services.posts import create_post, delete_post
from services.subscriptions import create_subscription, delete_subscription
from services.blocks import create_block
from users.models import BaseUser


# ============================================================
# Post counts
# ============================================================

class PostsCountSignalTests(TestCase):

    def setUp(self):
        self.user = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )

    # ---------- Create ----------

    def test_create_via_orm_increments(self):
        Post.objects.create(
            slug="p1", title="P1", content="c", author=self.user,
        )
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.posts_count, 1)

    def test_create_via_service_increments_once(self):
        create_post(
            slug="p1", title="P1", content="c", author=self.user,
        )
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.posts_count, 1)

    # ---------- Delete ----------

    def test_delete_via_instance_decrements(self):
        post = Post.objects.create(
            slug="p1", title="P1", content="c", author=self.user,
        )
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.posts_count, 1)

        post.delete()
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.posts_count, 0)

    def test_bulk_delete_decrements(self):
        Post.objects.create(slug="p1", title="P1", content="c", author=self.user)
        Post.objects.create(slug="p2", title="P2", content="c", author=self.user)

        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.posts_count, 2)

        Post.objects.filter(author=self.user).delete()

        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.posts_count, 0)

    def test_delete_via_service_decrements_once(self):
        post = create_post(
            slug="p1", title="P1", content="c", author=self.user,
        )
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.posts_count, 1)

        delete_post(post)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.posts_count, 0)

    # ---------- Edge cases ----------

    def test_update_does_not_change_count(self):
        post = Post.objects.create(
            slug="p1", title="P1", content="c", author=self.user,
        )
        post.title = "P1 — edited"
        post.save()

        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.posts_count, 1)

    def test_author_null_does_not_crash(self):
        Post.objects.create(
            slug="orphan", title="Orphan", content="c", author=None,
        )
        # هیچ خطایی نباید بده


# ============================================================
# Subscription counts
# ============================================================

class SubscriptionCountSignalTests(TestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com", password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com", password="pass1234",
        )

    # ---------- Create ----------

    def test_create_via_orm_increments(self):
        Subscription.objects.create(
            subscriber=self.user_a, target=self.user_b,
        )
        self.user_a.profile.refresh_from_db()
        self.user_b.profile.refresh_from_db()

        self.assertEqual(self.user_a.profile.subscription_count, 1)
        self.assertEqual(self.user_b.profile.subscriber_count, 1)

    def test_create_via_service_increments_once(self):
        create_subscription(
            subscriber=self.user_a, target=self.user_b,
        )
        self.user_a.profile.refresh_from_db()
        self.user_b.profile.refresh_from_db()

        self.assertEqual(self.user_a.profile.subscription_count, 1)
        self.assertEqual(self.user_b.profile.subscriber_count, 1)

    # ---------- Delete ----------

    def test_delete_via_instance_decrements(self):
        sub = Subscription.objects.create(
            subscriber=self.user_a, target=self.user_b,
        )
        sub.delete()

        self.user_a.profile.refresh_from_db()
        self.user_b.profile.refresh_from_db()

        self.assertEqual(self.user_a.profile.subscription_count, 0)
        self.assertEqual(self.user_b.profile.subscriber_count, 0)

    def test_bulk_delete_decrements(self):
        Subscription.objects.create(
            subscriber=self.user_a, target=self.user_b,
        )
        Subscription.objects.create(
            subscriber=self.user_b, target=self.user_a,
        )

        Subscription.objects.all().delete()

        self.user_a.profile.refresh_from_db()
        self.user_b.profile.refresh_from_db()

        self.assertEqual(self.user_a.profile.subscription_count, 0)
        self.assertEqual(self.user_a.profile.subscriber_count, 0)
        self.assertEqual(self.user_b.profile.subscription_count, 0)
        self.assertEqual(self.user_b.profile.subscriber_count, 0)

    def test_delete_via_service_decrements_once(self):
        sub = create_subscription(
            subscriber=self.user_a, target=self.user_b,
        )
        delete_subscription(sub)

        self.user_a.profile.refresh_from_db()
        self.user_b.profile.refresh_from_db()

        self.assertEqual(self.user_a.profile.subscription_count, 0)
        self.assertEqual(self.user_b.profile.subscriber_count, 0)

    # ---------- Update ----------

    def test_update_does_not_change_count(self):
        sub = Subscription.objects.create(
            subscriber=self.user_a, target=self.user_b,
        )
        sub.save()

        self.user_a.profile.refresh_from_db()
        self.user_b.profile.refresh_from_db()

        self.assertEqual(self.user_a.profile.subscription_count, 1)
        self.assertEqual(self.user_b.profile.subscriber_count, 1)

    # ---------- Block interaction ----------

    def test_block_cancels_subscription_and_updates_counts(self):
        create_subscription(
            subscriber=self.user_a, target=self.user_b,
        )
        self.user_a.profile.refresh_from_db()
        self.user_b.profile.refresh_from_db()
        self.assertEqual(self.user_a.profile.subscription_count, 1)
        self.assertEqual(self.user_b.profile.subscriber_count, 1)

        create_block(blocker=self.user_a, blocked=self.user_b)

        self.user_a.profile.refresh_from_db()
        self.user_b.profile.refresh_from_db()
        self.assertEqual(self.user_a.profile.subscription_count, 0)
        self.assertEqual(self.user_b.profile.subscriber_count, 0)

    # ---------- Cascade safety ----------

    def test_user_delete_does_not_crash(self):
        """حذف user با subscription موجود نباید crash کنه."""
        Subscription.objects.create(
            subscriber=self.user_a, target=self.user_b,
        )

        # حذف user_a — subscription cascade می‌شه
        self.user_a.delete()

        # user_b.subscriber_count باید صفر بشه
        self.user_b.profile.refresh_from_db()
        self.assertEqual(self.user_b.profile.subscriber_count, 0)