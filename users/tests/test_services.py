from django.test import TestCase

from posts.models import Subscription
from services.subscriptions import create_subscription
from services.posts import create_post, delete_post
from services.users import register_user
from users.models import BaseUser, Profile


class ProfileCountsTests(TestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )

    def test_posts_count_increments_on_create(self):
        self.assertEqual(self.user_a.profile.posts_count, 0)

        create_post(
            slug="post-1",
            title="Post 1",
            content="Content",
            author=self.user_a,
        )

        self.user_a.profile.refresh_from_db()
        self.assertEqual(self.user_a.profile.posts_count, 1)

    def test_posts_count_decrements_on_delete(self):
        post = create_post(
            slug="post-1",
            title="Post 1",
            content="Content",
            author=self.user_a,
        )

        self.user_a.profile.refresh_from_db()
        self.assertEqual(self.user_a.profile.posts_count, 1)

        delete_post(post)

        self.user_a.profile.refresh_from_db()
        self.assertEqual(self.user_a.profile.posts_count, 0)

    def test_subscription_counts_increment(self):
        create_subscription(
            subscriber=self.user_a,
            target=self.user_b,
        )

        self.user_a.profile.refresh_from_db()
        self.user_b.profile.refresh_from_db()

        # user_a به یکی subscribe کرده
        self.assertEqual(self.user_a.profile.subscription_count, 1)
        # user_b یکی subscriber داره
        self.assertEqual(self.user_b.profile.subscriber_count, 1)


class RegisterUserServiceTests(TestCase):

    def test_register_user_creates_user(self):
        user = register_user(
            email="new@test.com",
            password="pass1234",
            page_name="newuser",  # ← اضافه شد
        )

        self.assertEqual(user.email, "new@test.com")
        self.assertEqual(BaseUser.objects.count(), 1)

    def test_register_user_creates_profile_once(self):
        user = register_user(
            email="new@test.com",
            password="pass1234",
            page_name="newuser",  # ← اضافه شد
        )

        # دقیقاً یکی (نه صفر، نه دو)
        self.assertEqual(
            Profile.objects.filter(user=user).count(),
            1,
        )

    def test_register_user_sets_password(self):
        user = register_user(
            email="new@test.com",
            password="pass1234",
            page_name="newuser",  # ← اضافه شد
        )

        self.assertTrue(user.check_password("pass1234"))
        self.assertFalse(user.check_password("wrong"))