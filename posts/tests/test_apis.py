from datetime import timedelta

from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from posts.models import (
    Post, Subscription, Like, Comment, Block, Story,
    Conversation, Message, StoryView, StoryReaction, Share, Save,
)
from services.conversations import (
    get_or_create_conversation,
    create_message,
)
from services.stories import create_story_reply
from services.comments import create_comment
from users.models import BaseUser


@override_settings(CACHES={
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
})
class PostAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_post_authenticated(self):
        response = self.client.post(
            "/posts/",
            data={
                "slug": "test-post",
                "title": "Test Post",
                "content": "Some content",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["slug"], "test-post")
        self.assertEqual(response.data["author_email"], "a@test.com")
        self.assertEqual(Post.objects.count(), 1)

    def test_create_post_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            "/posts/",
            data={
                "slug": "test-post",
                "title": "Test Post",
                "content": "Some content",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Post.objects.count(), 0)

    def test_create_post_missing_fields(self):
        response = self.client.post(
            "/posts/",
            data={"slug": "test-post"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Post.objects.count(), 0)

    def test_create_post_duplicate_slug(self):
        Post.objects.create(
            slug="existing",
            title="Existing",
            content="Content",
            author=self.user,
        )

        response = self.client.post(
            "/posts/",
            data={
                "slug": "existing",
                "title": "Another Title",
                "content": "Another content",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Post.objects.count(), 1)

    def test_get_posts_empty(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/posts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_get_posts_with_data(self):
        Post.objects.create(
            slug="post-1",
            title="Post 1",
            content="Content 1",
            author=self.user,
        )
        Post.objects.create(
            slug="post-2",
            title="Post 2",
            content="Content 2",
            author=self.user,
        )

        self.client.force_authenticate(user=None)

        response = self.client.get("/posts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(len(response.data["results"]), 2)

    def test_cache_invalidated_after_create(self):
        # ۱. اول GET بزن، cache رو پر کن
        response_1 = self.client.get("/posts/")
        self.assertEqual(response_1.data["count"], 0)

        # ۲. یه پست بساز
        self.client.post(
            "/posts/",
            data={
                "slug": "new-post",
                "title": "New Post",
                "content": "Content",
            },
            format="json",
        )

        # ۳. دوباره GET بزن، باید پست رو ببینی
        response_2 = self.client.get("/posts/")
        self.assertEqual(response_2.data["count"], 1)
        self.assertEqual(response_2.data["results"][0]["slug"], "new-post")

    def test_delete_post(self):
        Post.objects.create(
            slug="to-delete",
            title="Delete Me",
            content="Content",
            author=self.user,
        )

        response = self.client.delete(
            "/posts/",
            data={"slug": "to-delete"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Post.objects.count(), 0)

    def test_delete_post_not_found(self):
        response = self.client.delete(
            "/posts/",
            data={"slug": "no-such-post"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_post_by_other_user_forbidden(self):
        other_user = BaseUser.objects.create_user(
            email="c@test.com",
            password="pass1234",
        )
        Post.objects.create(
            slug="my-post",
            title="My Post",
            content="Content",
            author=other_user,
        )

        response = self.client.delete(
            "/posts/",
            data={"slug": "my-post"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Post.objects.count(), 1)

    def test_get_posts_includes_likes_count(self):
        post = Post.objects.create(
            slug="test-post",
            title="Test Post",
            content="Content",
            author=self.user,
            likes_count=5,
        )

        self.client.force_authenticate(user=None)

        response = self.client.get("/posts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["likes_count"], 5)


class SubscriptionAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user_a)

    def test_create_subscription_success(self):
        response = self.client.post(
            "/posts/subscriptions/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["target_email"], "b@test.com")
        self.assertEqual(Subscription.objects.count(), 1)

    def test_create_subscription_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            "/posts/subscriptions/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Subscription.objects.count(), 0)

    def test_create_subscription_target_not_found(self):
        response = self.client.post(
            "/posts/subscriptions/",
            data={"target_email": "nobody@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Subscription.objects.count(), 0)

    def test_create_subscription_self(self):
        response = self.client.post(
            "/posts/subscriptions/",
            data={"target_email": "a@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Subscription.objects.count(), 0)

    def test_create_subscription_duplicate(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )

        response = self.client.post(
            "/posts/subscriptions/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Subscription.objects.count(), 1)

    def test_get_subscriptions_empty(self):
        response = self.client.get("/posts/subscriptions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_subscriptions_with_data(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )

        response = self.client.get("/posts/subscriptions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["target_email"], "b@test.com")

    def test_get_subscriptions_only_own(self):
        # user_a به user_b subscribe کرده
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )
        # user_b به user_a subscribe کرده (که نباید در لیست user_a بیاد)
        Subscription.objects.create(
            subscriber=self.user_b,
            target=self.user_a,
        )

        response = self.client.get("/posts/subscriptions/")

        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["target_email"], "b@test.com")

    def test_get_subscriptions_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/posts/subscriptions/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_subscription_success(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )

        response = self.client.delete(
            "/posts/subscriptions/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Subscription.objects.count(), 0)

    def test_delete_subscription_not_found(self):
        response = self.client.delete(
            "/posts/subscriptions/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_subscription_target_not_found(self):
        response = self.client.delete(
            "/posts/subscriptions/",
            data={"target_email": "nobody@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_subscription_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.delete(
            "/posts/subscriptions/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LikeAPITests(APITestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.post = Post.objects.create(
            slug="test-post",
            title="Test Post",
            content="Content",
            author=self.user_a,
        )
        self.client.force_authenticate(user=self.user_a)

    def test_like_post_success(self):
        response = self.client.post("/posts/test-post/like/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Like.objects.count(), 1)

        self.post.refresh_from_db()
        self.assertEqual(self.post.likes_count, 1)

    def test_like_post_duplicate(self):
        Like.objects.create(user=self.user_a, post=self.post)
        self.post.likes_count = 1
        self.post.save()

        response = self.client.post("/posts/test-post/like/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Like.objects.count(), 1)

    def test_like_nonexistent_post(self):
        response = self.client.post("/posts/no-such-post/like/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Like.objects.count(), 0)

    def test_like_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.post("/posts/test-post/like/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Like.objects.count(), 0)

    def test_unlike_post_success(self):
        Like.objects.create(user=self.user_a, post=self.post)
        self.post.likes_count = 1
        self.post.save()

        response = self.client.delete("/posts/test-post/like/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Like.objects.count(), 0)

        self.post.refresh_from_db()
        self.assertEqual(self.post.likes_count, 0)

    def test_unlike_nonexistent_like(self):
        response = self.client.delete("/posts/test-post/like/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unlike_nonexistent_post(self):
        response = self.client.delete("/posts/no-such-post/like/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unlike_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.delete("/posts/test-post/like/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_likes_count_multiple_users(self):
        # user_a like می‌زنه
        self.client.post("/posts/test-post/like/")

        # user_b هم like می‌زنه
        self.client.force_authenticate(user=self.user_b)
        self.client.post("/posts/test-post/like/")

        self.post.refresh_from_db()
        self.assertEqual(self.post.likes_count, 2)
        self.assertEqual(Like.objects.filter(post=self.post).count(), 2)

    def test_likes_count_after_unlike(self):
        # هر دو like می‌زنن
        self.client.post("/posts/test-post/like/")

        self.client.force_authenticate(user=self.user_b)
        self.client.post("/posts/test-post/like/")

        # user_a unlike می‌زنه
        self.client.force_authenticate(user=self.user_a)
        self.client.delete("/posts/test-post/like/")

        self.post.refresh_from_db()
        self.assertEqual(self.post.likes_count, 1)


class CommentAPITests(APITestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.post = Post.objects.create(
            slug="test-post",
            title="Test Post",
            content="Content",
            author=self.user_a,
        )
        self.client.force_authenticate(user=self.user_a)

    def test_create_comment_success(self):
        response = self.client.post(
            "/posts/test-post/comments/",
            data={"content": "Nice post!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content"], "Nice post!")
        self.assertEqual(response.data["user_email"], "a@test.com")
        self.assertEqual(Comment.objects.count(), 1)

        self.post.refresh_from_db()
        self.assertEqual(self.post.comments_count, 1)

    def test_create_comment_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            "/posts/test-post/comments/",
            data={"content": "Nice post!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(Comment.objects.count(), 0)

    def test_create_comment_nonexistent_post(self):
        response = self.client.post(
            "/posts/no-such-post/comments/",
            data={"content": "Nice post!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_comment_empty_content(self):
        response = self.client.post(
            "/posts/test-post/comments/",
            data={"content": ""},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Comment.objects.count(), 0)

    def test_get_comments_list(self):
        Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="First",
        )
        Comment.objects.create(
            user=self.user_b,
            post=self.post,
            content="Second",
        )

        response = self.client.get("/posts/test-post/comments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_get_comments_nonexistent_post(self):
        response = self.client.get("/posts/no-such-post/comments/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_comments_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/posts/test-post/comments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_patch_comment_success(self):
        comment = Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Original",
        )

        response = self.client.patch(
            f"/posts/test-post/comments/{comment.id}/",
            data={"content": "Edited"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["content"], "Edited")

        comment.refresh_from_db()
        self.assertEqual(comment.content, "Edited")

    def test_patch_comment_by_other_user_forbidden(self):
        comment = Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Original",
        )

        self.client.force_authenticate(user=self.user_b)

        response = self.client.patch(
            f"/posts/test-post/comments/{comment.id}/",
            data={"content": "Hacked"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        comment.refresh_from_db()
        self.assertEqual(comment.content, "Original")

    def test_patch_nonexistent_comment(self):
        response = self.client.patch(
            "/posts/test-post/comments/9999/",
            data={"content": "Edited"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_comment_success(self):
        comment = Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Original",
        )
        self.post.comments_count = 1
        self.post.save()

        response = self.client.delete(
            f"/posts/test-post/comments/{comment.id}/",
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Comment.objects.count(), 0)

        self.post.refresh_from_db()
        self.assertEqual(self.post.comments_count, 0)

    def test_delete_comment_by_other_user_forbidden(self):
        comment = Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Original",
        )

        self.client.force_authenticate(user=self.user_b)

        response = self.client.delete(
            f"/posts/test-post/comments/{comment.id}/",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Comment.objects.count(), 1)

    def test_delete_nonexistent_comment(self):
        response = self.client.delete(
            "/posts/test-post/comments/9999/",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class FeedAPITests(APITestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.user_c = BaseUser.objects.create_user(
            email="c@test.com",
            password="pass1234",
        )

        # پست‌های user_b و user_c
        self.post_b = Post.objects.create(
            slug="post-b",
            title="Post from B",
            content="Content B",
            author=self.user_b,
        )
        self.post_c = Post.objects.create(
            slug="post-c",
            title="Post from C",
            content="Content C",
            author=self.user_c,
        )

        # پست user_a (نباید در feed بیاد)
        Post.objects.create(
            slug="post-a",
            title="Post from A",
            content="Content A",
            author=self.user_a,
        )

        self.client.force_authenticate(user=self.user_a)

    def test_feed_empty_without_subscriptions(self):
        response = self.client.get("/posts/feed/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_feed_shows_only_subscribed_users_posts(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )

        response = self.client.get("/posts/feed/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["slug"], "post-b")

    def test_feed_shows_multiple_subscribed_users_posts(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_c,
        )

        response = self.client.get("/posts/feed/")

        self.assertEqual(response.data["count"], 2)
        slugs = {r["slug"] for r in response.data["results"]}
        self.assertEqual(slugs, {"post-b", "post-c"})

    def test_own_posts_not_in_feed(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )

        response = self.client.get("/posts/feed/")

        slugs = {r["slug"] for r in response.data["results"]}
        self.assertNotIn("post-a", slugs)

    def test_feed_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/posts/feed/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_feed_ordered_by_created_at_desc(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_c,
        )

        response = self.client.get("/posts/feed/")

        # post_c جدیدتره (چون بعد از post_b ساخته شد)
        self.assertEqual(response.data["results"][0]["slug"], "post-c")
        self.assertEqual(response.data["results"][1]["slug"], "post-b")

    def test_feed_query_count_is_constant(self):
        # user_a به ۳ کاربر subscribe کنه، هر کدوم چند پست
        for i in range(3):
            user = BaseUser.objects.create_user(
                email=f"user{i}@test.com",
                password="pass1234",
            )
            Subscription.objects.create(
                subscriber=self.user_a,
                target=user,
            )
            for j in range(3):
                Post.objects.create(
                    slug=f"post-{i}-{j}",
                    title=f"Post {i}-{j}",
                    content="Content",
                    author=user,
                )

        # ۱ query: get_blocked_user_ids
        # ۱ query: pagination count
        # ۱ query: paginated results (with select_related)
        with self.assertNumQueries(4):
            response = self.client.get("/posts/feed/")
            for result in response.data["results"]:
                _ = result["author_email"]


class BlockAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user_a)

    def test_block_user_success(self):
        response = self.client.post(
            "/posts/blocks/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["blocked_email"], "b@test.com")
        self.assertEqual(Block.objects.count(), 1)

    def test_block_user_self_raises(self):
        response = self.client.post(
            "/posts/blocks/",
            data={"target_email": "a@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Block.objects.count(), 0)

    def test_block_user_not_found(self):
        response = self.client.post(
            "/posts/blocks/",
            data={"target_email": "nobody@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_block_user_duplicate(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.post(
            "/posts/blocks/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Block.objects.count(), 1)

    def test_block_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            "/posts/blocks/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_blocks(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.get("/posts/blocks/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["blocked_email"], "b@test.com")

    def test_unblock_success(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.delete(
            "/posts/blocks/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Block.objects.count(), 0)

    def test_unblock_not_found(self):
        response = self.client.delete(
            "/posts/blocks/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_blocked_post_not_visible_in_list(self):
        # B یه پست می‌سازه
        Post.objects.create(
            slug="b-post",
            title="B Post",
            content="Content",
            author=self.user_b,
        )

        # A، B رو بلاک می‌کنه
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        # A لیست پست‌ها رو می‌بینه
        response = self.client.get("/posts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_blocked_post_detail_not_visible(self):
        Post.objects.create(
            slug="b-post",
            title="B Post",
            content="Content",
            author=self.user_b,
        )
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        # A نمی‌تونه B رو لایک کنه
        response = self.client.post("/posts/b-post/like/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_blocked_user_profile_not_visible(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.get(f"/users/{self.user_b.id}/profile/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CommentReplyAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.post = Post.objects.create(
            slug="test-post",
            title="Test Post",
            content="Content",
            author=self.user_a,
        )
        self.client.force_authenticate(user=self.user_a)

    def test_create_reply_success(self):
        parent = create_comment(
            user=self.user_a,
            post=self.post,
            content="Parent comment",
        )

        response = self.client.post(
            "/posts/test-post/comments/",
            data={
                "content": "My reply",
                "parent_id": parent.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["parent_id"], parent.id)
        self.assertEqual(response.data["content"], "My reply")

        self.post.refresh_from_db()
        self.assertEqual(self.post.comments_count, 2)  # parent + reply

    def test_create_reply_nonexistent_parent(self):
        response = self.client.post(
            "/posts/test-post/comments/",
            data={
                "content": "My reply",
                "parent_id": 9999,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_top_level_list_excludes_replies(self):
        parent = Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Parent comment",
        )
        Comment.objects.create(
            user=self.user_b,
            post=self.post,
            content="Reply",
            parent=parent,
        )

        response = self.client.get("/posts/test-post/comments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # فقط top-level
        self.assertEqual(response.data[0]["replies_count"], 1)

    def test_list_replies(self):
        parent = Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Parent comment",
        )
        Comment.objects.create(
            user=self.user_b,
            post=self.post,
            content="Reply 1",
            parent=parent,
        )
        Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Reply 2",
            parent=parent,
        )

        response = self.client.get(
            f"/posts/test-post/comments/{parent.id}/replies/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["content"], "Reply 1")  # صعودی

    def test_list_replies_of_nonexistent_comment(self):
        response = self.client.get(
            "/posts/test-post/comments/9999/replies/"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nested_replies(self):
        # top-level
        c1 = Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Top",
        )
        # reply to c1
        c2 = Comment.objects.create(
            user=self.user_b,
            post=self.post,
            content="Reply to top",
            parent=c1,
        )
        # reply to c2
        Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Reply to reply",
            parent=c2,
        )

        # top-level list: فقط c1
        response = self.client.get("/posts/test-post/comments/")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["replies_count"], 1)

        # replies of c1: فقط c2
        response = self.client.get(
            f"/posts/test-post/comments/{c1.id}/replies/"
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["replies_count"], 1)

    def test_delete_parent_cascades_replies(self):
        parent = Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Parent",
        )
        Comment.objects.create(
            user=self.user_b,
            post=self.post,
            content="Reply 1",
            parent=parent,
        )
        Comment.objects.create(
            user=self.user_a,
            post=self.post,
            content="Reply 2",
            parent=parent,
        )

        response = self.client.delete(
            f"/posts/test-post/comments/{parent.id}/",
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Comment.objects.count(), 0)  # همه پاک شدن

        self.post.refresh_from_db()
        self.assertEqual(self.post.comments_count, 0)

    def test_create_reply_to_reply(self):
        parent = create_comment(
            user=self.user_a,
            post=self.post,
            content="Parent",
        )

        # reply به parent
        response = self.client.post(
            "/posts/test-post/comments/",
            data={"content": "Reply", "parent_id": parent.id},
            format="json",
        )
        reply_id = response.data["id"]

        # reply به reply
        response = self.client.post(
            "/posts/test-post/comments/",
            data={"content": "Reply to reply", "parent_id": reply_id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["parent_id"], reply_id)

        self.post.refresh_from_db()
        self.assertEqual(self.post.comments_count, 3)

        def test_blocked_user_comments_hidden(self):
            # B یه کامنت می‌ذاره
            Comment.objects.create(
                user=self.user_b,
                post=self.post,
                content="B's comment",
            )

            # A، B رو بلاک می‌کنه
            Block.objects.create(blocker=self.user_a, blocked=self.user_b)

            # A کامنت‌ها رو می‌بینه
            response = self.client.get("/posts/test-post/comments/")

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data), 0)

        def test_blocked_user_replies_hidden(self):
            # parent از A
            parent = create_comment(
                user=self.user_a,
                post=self.post,
                content="Parent",
            )
            # reply از B
            Comment.objects.create(
                user=self.user_b,
                post=self.post,
                content="B's reply",
                parent=parent,
            )
            # reply از A (که باید دیده بشه)
            Comment.objects.create(
                user=self.user_a,
                post=self.post,
                content="A's reply",
                parent=parent,
            )

            # A، B رو بلاک می‌کنه
            Block.objects.create(blocker=self.user_a, blocked=self.user_b)

            response = self.client.get(
                f"/posts/test-post/comments/{parent.id}/replies/"
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data), 1)
            self.assertEqual(response.data[0]["content"], "A's reply")


class StoryAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user_a)

    def test_create_text_story(self):
        response = self.client.post(
            "/posts/stories/",
            data={"text": "My story"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["text"], "My story")
        self.assertIsNone(response.data["image"])
        self.assertEqual(Story.objects.count(), 1)

    def test_create_story_without_text_or_image(self):
        response = self.client.post(
            "/posts/stories/",
            data={},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Story.objects.count(), 0)

    def test_create_story_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            "/posts/stories/",
            data={"text": "My story"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_own_stories(self):
        Story.objects.create(
            author=self.user_a,
            text="Story 1",
            expires_at=timezone.now() + timedelta(hours=24),
        )
        Story.objects.create(
            author=self.user_b,
            text="Story B",
            expires_at=timezone.now() + timedelta(hours=24),
        )

        response = self.client.get("/posts/stories/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["text"], "Story 1")

    def test_list_excludes_expired(self):
        Story.objects.create(
            author=self.user_a,
            text="Active",
            expires_at=timezone.now() + timedelta(hours=24),
        )
        Story.objects.create(
            author=self.user_a,
            text="Expired",
            expires_at=timezone.now() - timedelta(hours=1),
        )

        response = self.client.get("/posts/stories/")

        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["text"], "Active")

    def test_delete_story(self):
        story = Story.objects.create(
            author=self.user_a,
            text="Delete me",
            expires_at=timezone.now() + timedelta(hours=24),
        )

        response = self.client.delete(f"/posts/stories/{story.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Story.objects.count(), 0)

    def test_delete_other_user_story_forbidden(self):
        story = Story.objects.create(
            author=self.user_b,
            text="Not yours",
            expires_at=timezone.now() + timedelta(hours=24),
        )

        response = self.client.delete(f"/posts/stories/{story.id}/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Story.objects.count(), 1)

    def test_delete_nonexistent_story(self):
        response = self.client.delete("/posts/stories/9999/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class StoryFeedAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.user_c = BaseUser.objects.create_user(
            email="c@test.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user_a)

    def test_feed_empty_without_subscriptions(self):
        Story.objects.create(
            author=self.user_b,
            text="B's story",
            expires_at=timezone.now() + timedelta(hours=24),
        )

        response = self.client.get("/posts/stories/feed/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_feed_shows_subscribed_authors_stories(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )
        Story.objects.create(
            author=self.user_b,
            text="B's story",
            expires_at=timezone.now() + timedelta(hours=24),
        )

        response = self.client.get("/posts/stories/feed/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["author_email"], "b@test.com")
        self.assertEqual(len(response.data[0]["stories"]), 1)

    def test_feed_grouped_by_author(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_c,
        )
        Story.objects.create(
            author=self.user_b,
            text="B1",
            expires_at=timezone.now() + timedelta(hours=24),
        )
        Story.objects.create(
            author=self.user_b,
            text="B2",
            expires_at=timezone.now() + timedelta(hours=24),
        )
        Story.objects.create(
            author=self.user_c,
            text="C1",
            expires_at=timezone.now() + timedelta(hours=24),
        )

        response = self.client.get("/posts/stories/feed/")

        self.assertEqual(len(response.data), 2)
        groups = {g["author_email"]: len(g["stories"]) for g in response.data}
        self.assertEqual(groups["b@test.com"], 2)
        self.assertEqual(groups["c@test.com"], 1)

    def test_feed_excludes_blocked_users(self):
        Subscription.objects.create(
            subscriber=self.user_a,
            target=self.user_b,
        )
        Story.objects.create(
            author=self.user_b,
            text="B's story",
            expires_at=timezone.now() + timedelta(hours=24),
        )
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.get("/posts/stories/feed/")

        self.assertEqual(len(response.data), 0)


class StoryViaMessagesAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com", password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com", password="pass1234",
        )
        self.story = Story.objects.create(
            author=self.user_a,
            text="hi",
            expires_at=timezone.now() + timedelta(hours=24),
        )

    def test_list_via_messages_empty(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(
            f"/posts/stories/{self.story.id}/via-messages/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_list_via_messages_with_data(self):
        # user_b به استوری user_a پاسخ می‌ده
        create_story_reply(self.user_b, self.story, "nice!")

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(
            f"/posts/stories/{self.story.id}/via-messages/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["content"], "nice!")
        self.assertEqual(response.data[0]["sender_email"], "b@test.com")

    def test_list_via_messages_only_owner(self):
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(
            f"/posts/stories/{self.story.id}/via-messages/"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_via_messages_nonexistent_story(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/posts/stories/9999/via-messages/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ConversationAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user_a)

    def test_start_conversation_success(self):
        response = self.client.post(
            "/posts/conversations/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["other_user_email"], "b@test.com")
        self.assertEqual(response.data["unread_count"], 0)
        self.assertEqual(Conversation.objects.count(), 1)

    def test_start_conversation_idempotent(self):
        self.client.post(
            "/posts/conversations/",
            data={"target_email": "b@test.com"},
            format="json",
        )
        response = self.client.post(
            "/posts/conversations/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.count(), 1)

    def test_start_conversation_with_self_raises(self):
        response = self.client.post(
            "/posts/conversations/",
            data={"target_email": "a@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Conversation.objects.count(), 0)

    def test_start_conversation_user_not_found(self):
        response = self.client.post(
            "/posts/conversations/",
            data={"target_email": "nobody@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_start_conversation_with_blocked_user(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.post(
            "/posts/conversations/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_start_conversation_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            "/posts/conversations/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_conversations(self):
        get_or_create_conversation(self.user_a, self.user_b)

        response = self.client.get("/posts/conversations/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class MessageAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.user_c = BaseUser.objects.create_user(
            email="c@test.com",
            password="pass1234",
        )
        self.conversation = get_or_create_conversation(
            self.user_a, self.user_b,
        )
        self.client.force_authenticate(user=self.user_a)

    def test_send_message_success(self):
        response = self.client.post(
            f"/posts/conversations/{self.conversation.id}/messages/",
            data={"content": "Hello!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content"], "Hello!")
        self.assertEqual(response.data["sender_email"], "a@test.com")
        self.assertTrue(response.data["is_own"])
        self.assertEqual(Message.objects.count(), 1)

    def test_send_message_empty_content(self):
        response = self.client.post(
            f"/posts/conversations/{self.conversation.id}/messages/",
            data={"content": ""},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_send_message_nonexistent_conversation(self):
        response = self.client.post(
            "/posts/conversations/9999/messages/",
            data={"content": "Hello!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_send_message_not_participant(self):
        self.client.force_authenticate(user=self.user_c)

        response = self.client.post(
            f"/posts/conversations/{self.conversation.id}/messages/",
            data={"content": "Hi!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_send_message_when_blocked(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.post(
            f"/posts/conversations/{self.conversation.id}/messages/",
            data={"content": "Hi!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_messages(self):
        Message.objects.create(
            conversation=self.conversation,
            sender=self.user_a,
            content="Msg 1",
        )
        Message.objects.create(
            conversation=self.conversation,
            sender=self.user_b,
            content="Msg 2",
        )

        response = self.client.get(
            f"/posts/conversations/{self.conversation.id}/messages/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        # جدیدترین اول
        self.assertEqual(response.data[0]["content"], "Msg 2")

    def test_list_messages_is_own_flag(self):
        Message.objects.create(
            conversation=self.conversation,
            sender=self.user_a,
            content="From A",
        )
        Message.objects.create(
            conversation=self.conversation,
            sender=self.user_b,
            content="From B",
        )

        response = self.client.get(
            f"/posts/conversations/{self.conversation.id}/messages/"
        )

        # از دید user_a
        for msg in response.data:
            if msg["sender_email"] == "a@test.com":
                self.assertTrue(msg["is_own"])
            else:
                self.assertFalse(msg["is_own"])

    def test_mark_as_read(self):
        Message.objects.create(
            conversation=self.conversation,
            sender=self.user_a,
            content="From A",
        )

        # user_b (نه sender)
        self.client.force_authenticate(user=self.user_b)
        response = self.client.post(
            f"/posts/conversations/{self.conversation.id}/read/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated"], 1)

    def test_mark_as_read_not_participant(self):
        self.client.force_authenticate(user=self.user_c)

        response = self.client.post(
            f"/posts/conversations/{self.conversation.id}/read/"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class StoryViewAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.story = Story.objects.create(
            author=self.user_a,
            text="A's story",
            expires_at=timezone.now() + timedelta(hours=24),
        )
        self.client.force_authenticate(user=self.user_b)

    def test_mark_story_viewed(self):
        response = self.client.post(
            f"/posts/stories/{self.story.id}/view/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(StoryView.objects.count(), 1)

    def test_mark_story_viewed_idempotent(self):
        self.client.post(f"/posts/stories/{self.story.id}/view/")
        self.client.post(f"/posts/stories/{self.story.id}/view/")

        self.assertEqual(StoryView.objects.count(), 1)

    def test_mark_nonexistent_story(self):
        response = self.client.post("/posts/stories/9999/view/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_expired_story(self):
        expired = Story.objects.create(
            author=self.user_a,
            text="Expired",
            expires_at=timezone.now() - timedelta(hours=1),
        )

        response = self.client.post(f"/posts/stories/{expired.id}/view/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_own_story(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.post(f"/posts/stories/{self.story.id}/view/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # نباید view ثبت بشه
        self.assertEqual(StoryView.objects.count(), 0)

    def test_mark_story_when_blocked(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.post(f"/posts/stories/{self.story.id}/view/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_viewers_as_owner(self):
        StoryView.objects.create(story=self.story, viewer=self.user_b)
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(f"/posts/stories/{self.story.id}/viewers/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["viewer_email"], "b@test.com")

    def test_list_viewers_as_non_owner(self):
        # user_b صاحب story نیست → 403
        response = self.client.get(f"/posts/stories/{self.story.id}/viewers/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_views_count_in_story_list(self):
        StoryView.objects.create(story=self.story, viewer=self.user_b)

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/posts/stories/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["views_count"], 1)


class StoryReactionAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.story = Story.objects.create(
            author=self.user_a,
            text="A's story",
            expires_at=timezone.now() + timedelta(hours=24),
        )
        self.client.force_authenticate(user=self.user_b)

    def test_react_success(self):
        response = self.client.post(
            f"/posts/stories/{self.story.id}/reactions/",
            data={"emoji": "❤️"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["emoji"], "❤️")
        self.assertEqual(StoryReaction.objects.count(), 1)

    def test_react_update(self):
        StoryReaction.objects.create(
            story=self.story,
            user=self.user_b,
            emoji="❤️",
        )

        response = self.client.post(
            f"/posts/stories/{self.story.id}/reactions/",
            data={"emoji": "😂"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # فقط یکی باقی می‌مونه
        self.assertEqual(StoryReaction.objects.count(), 1)
        reaction = StoryReaction.objects.first()
        self.assertEqual(reaction.emoji, "😂")

    def test_react_invalid_emoji(self):
        response = self.client.post(
            f"/posts/stories/{self.story.id}/reactions/",
            data={"emoji": "🔥"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_react_own_story(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.post(
            f"/posts/stories/{self.story.id}/reactions/",
            data={"emoji": "❤️"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_react_nonexistent_story(self):
        response = self.client.post(
            "/posts/stories/9999/reactions/",
            data={"emoji": "❤️"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_react_expired_story(self):
        expired = Story.objects.create(
            author=self.user_a,
            text="Expired",
            expires_at=timezone.now() - timedelta(hours=1),
        )

        response = self.client.post(
            f"/posts/stories/{expired.id}/reactions/",
            data={"emoji": "❤️"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_react_when_blocked(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.post(
            f"/posts/stories/{self.story.id}/reactions/",
            data={"emoji": "❤️"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_reactions(self):
        StoryReaction.objects.create(
            story=self.story,
            user=self.user_b,
            emoji="❤️",
        )

        response = self.client.get(
            f"/posts/stories/{self.story.id}/reactions/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["emoji"], "❤️")
        self.assertEqual(response.data[0]["count"], 1)
        self.assertEqual(response.data[0]["my_reaction"], "❤️")

    def test_list_reactions_multiple_users(self):
        user_c = BaseUser.objects.create_user(
            email="c@test.com",
            password="pass1234",
        )
        StoryReaction.objects.create(
            story=self.story, user=self.user_b, emoji="❤️",
        )
        StoryReaction.objects.create(
            story=self.story, user=user_c, emoji="❤️",
        )

        response = self.client.get(
            f"/posts/stories/{self.story.id}/reactions/"
        )

        self.assertEqual(response.data[0]["count"], 2)

    def test_delete_reaction(self):
        StoryReaction.objects.create(
            story=self.story,
            user=self.user_b,
            emoji="❤️",
        )

        response = self.client.delete(
            f"/posts/stories/{self.story.id}/reactions/"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(StoryReaction.objects.count(), 0)

    def test_views_and_reactions_count_in_story_list(self):
        StoryReaction.objects.create(
            story=self.story,
            user=self.user_b,
            emoji="❤️",
        )
        StoryView.objects.create(
            story=self.story,
            viewer=self.user_b,
        )

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/posts/stories/")

        self.assertEqual(response.data[0]["views_count"], 1)
        self.assertEqual(response.data[0]["reactions_count"], 1)


class MessageDetailAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.conversation = get_or_create_conversation(
            self.user_a, self.user_b,
        )
        self.message = create_message(
            self.conversation, self.user_a, "Original",
        )
        self.client.force_authenticate(user=self.user_a)

    def test_edit_message_success(self):
        response = self.client.patch(
            f"/posts/conversations/{self.conversation.id}/messages/{self.message.id}/",
            data={"content": "Edited"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["content"], "Edited")
        self.assertIsNotNone(response.data["edited_at"])

        self.message.refresh_from_db()
        self.assertEqual(self.message.content, "Edited")
        self.assertIsNotNone(self.message.edited_at)

    def test_edit_message_by_other_user(self):
        self.client.force_authenticate(user=self.user_b)

        response = self.client.patch(
            f"/posts/conversations/{self.conversation.id}/messages/{self.message.id}/",
            data={"content": "Hacked"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.message.refresh_from_db()
        self.assertEqual(self.message.content, "Original")

    def test_edit_message_after_15_minutes(self):
        # created_at رو به ۲۰ دقیقه قبل تغییر بده
        from datetime import timedelta
        from django.utils import timezone

        old_time = timezone.now() - timedelta(minutes=20)
        Message.objects.filter(id=self.message.id).update(created_at=old_time)

        response = self.client.patch(
            f"/posts/conversations/{self.conversation.id}/messages/{self.message.id}/",
            data={"content": "Too late"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_edit_deleted_message(self):
        self.message.is_deleted = True
        self.message.save()

        response = self.client.patch(
            f"/posts/conversations/{self.conversation.id}/messages/{self.message.id}/",
            data={"content": "Try"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_edit_message_not_found(self):
        response = self.client.patch(
            f"/posts/conversations/{self.conversation.id}/messages/9999/",
            data={"content": "Try"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_edit_message_not_participant(self):
        user_c = BaseUser.objects.create_user(
            email="c@test.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=user_c)

        response = self.client.patch(
            f"/posts/conversations/{self.conversation.id}/messages/{self.message.id}/",
            data={"content": "Try"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_message_success(self):
        response = self.client.delete(
            f"/posts/conversations/{self.conversation.id}/messages/{self.message.id}/",
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.message.refresh_from_db()
        self.assertTrue(self.message.is_deleted)
        self.assertIsNotNone(self.message.deleted_at)

    def test_delete_message_by_other_user(self):
        self.client.force_authenticate(user=self.user_b)

        response = self.client.delete(
            f"/posts/conversations/{self.conversation.id}/messages/{self.message.id}/",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.message.refresh_from_db()
        self.assertFalse(self.message.is_deleted)

    def test_delete_already_deleted_message(self):
        self.message.is_deleted = True
        self.message.save()

        response = self.client.delete(
            f"/posts/conversations/{self.conversation.id}/messages/{self.message.id}/",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_message_not_found(self):
        response = self.client.delete(
            f"/posts/conversations/{self.conversation.id}/messages/9999/",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ShareAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.post = Post.objects.create(
            slug="test-post",
            title="Test Post",
            content="Content",
            author=self.user_a,
        )
        self.client.force_authenticate(user=self.user_b)

    def test_share_success(self):
        response = self.client.post(
            "/posts/test-post/share/",
            data={"comment": "Check this out!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["comment"], "Check this out!")
        self.assertEqual(Share.objects.count(), 1)

        self.post.refresh_from_db()
        self.assertEqual(self.post.shares_count, 1)

    def test_share_without_comment(self):
        response = self.client.post(
            "/posts/test-post/share/",
            data={},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["comment"])

    def test_share_duplicate(self):
        Share.objects.create(user=self.user_b, post=self.post)
        self.post.shares_count = 1
        self.post.save()

        response = self.client.post(
            "/posts/test-post/share/",
            data={},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Share.objects.count(), 1)

    def test_share_nonexistent_post(self):
        response = self.client.post(
            "/posts/no-such/share/",
            data={},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_share_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            "/posts/test-post/share/",
            data={},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_share_when_blocked(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.post(
            "/posts/test-post/share/",
            data={},
            format="json",
        )

        # 404 چون get_visible_post جلوش رو می‌گیره
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unshare_success(self):
        Share.objects.create(user=self.user_b, post=self.post)
        self.post.shares_count = 1
        self.post.save()

        response = self.client.delete("/posts/test-post/share/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Share.objects.count(), 0)

        self.post.refresh_from_db()
        self.assertEqual(self.post.shares_count, 0)

    def test_unshare_not_found(self):
        response = self.client.delete("/posts/test-post/share/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_user_shares(self):
        Share.objects.create(
            user=self.user_b,
            post=self.post,
            comment="Nice!",
        )

        response = self.client.get(
            f"/posts/users/{self.user_b.id}/shares/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["comment"], "Nice!")

    def test_list_user_shares_nonexistent_user(self):
        response = self.client.get("/posts/users/9999/shares/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_shares_count_in_post_output(self):
        Share.objects.create(user=self.user_b, post=self.post)
        self.post.shares_count = 1
        self.post.save()

        self.client.force_authenticate(user=None)
        response = self.client.get("/posts/")

        self.assertEqual(response.data["results"][0]["shares_count"], 1)


class SaveAPITests(APITestCase):

    def setUp(self):
        cache.clear()

        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.post = Post.objects.create(
            slug="test-post",
            title="Test Post",
            content="Content",
            author=self.user_a,
        )
        self.client.force_authenticate(user=self.user_b)

    def test_save_success(self):
        response = self.client.post("/posts/test-post/save/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Save.objects.count(), 1)

    def test_save_duplicate(self):
        Save.objects.create(user=self.user_b, post=self.post)

        response = self.client.post("/posts/test-post/save/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Save.objects.count(), 1)

    def test_save_nonexistent_post(self):
        response = self.client.post("/posts/no-such/save/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_save_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.post("/posts/test-post/save/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_save_when_blocked(self):
        Block.objects.create(blocker=self.user_a, blocked=self.user_b)

        response = self.client.post("/posts/test-post/save/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unsave_success(self):
        Save.objects.create(user=self.user_b, post=self.post)

        response = self.client.delete("/posts/test-post/save/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Save.objects.count(), 0)

    def test_unsave_not_found(self):
        response = self.client.delete("/posts/test-post/save/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_saved_posts(self):
        Save.objects.create(user=self.user_b, post=self.post)

        response = self.client.get("/posts/users/me/saved/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["slug"], "test-post")
        self.assertTrue(response.data["results"][0]["is_saved"])

    def test_list_saved_posts_private(self):
        """Saveهای user_b نباید برای user_a دیده بشن."""
        Save.objects.create(user=self.user_b, post=self.post)

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/posts/users/me/saved/")

        self.assertEqual(response.data["count"], 0)

    def test_list_saved_posts_blocked_excluded(self):
        Save.objects.create(user=self.user_b, post=self.post)
        Block.objects.create(blocker=self.user_b, blocked=self.user_a)

        response = self.client.get("/posts/users/me/saved/")

        self.assertEqual(response.data["count"], 0)

    def test_is_saved_false_for_anonymous(self):
        Save.objects.create(user=self.user_b, post=self.post)

        self.client.force_authenticate(user=None)
        response = self.client.get("/posts/")

        self.assertFalse(response.data["results"][0]["is_saved"])

    def test_is_saved_true_for_saver(self):
        Save.objects.create(user=self.user_b, post=self.post)

        response = self.client.get("/posts/")

        self.assertTrue(response.data["results"][0]["is_saved"])

    def test_is_saved_false_for_other_user(self):
        Save.objects.create(user=self.user_b, post=self.post)

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/posts/")

        self.assertFalse(response.data["results"][0]["is_saved"])


class CacheInvalidationTests(APITestCase):
    """تست‌های تأیید fix اولویت ۰."""

    def setUp(self):
        cache.clear()
        self.user = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user)
        self.post = Post.objects.create(
            slug="test-post",
            title="Test Post",
            content="Content",
            author=self.user,
        )

    def test_cache_invalidated_after_comment(self):
        # ۱. cache رو پر کن
        response_1 = self.client.get("/posts/")
        self.assertEqual(response_1.data["results"][0]["comments_count"], 0)

        # ۲. کامنت بذار
        self.client.post(
            "/posts/test-post/comments/",
            data={"content": "Nice!"},
            format="json",
        )

        # ۳. باید تو cache جدید ببینی
        response_2 = self.client.get("/posts/")
        self.assertEqual(response_2.data["results"][0]["comments_count"], 1)

    def test_cache_invalidated_after_share(self):
        response_1 = self.client.get("/posts/")
        self.assertEqual(response_1.data["results"][0]["shares_count"], 0)

        self.client.post("/posts/test-post/share/", data={}, format="json")

        response_2 = self.client.get("/posts/")
        self.assertEqual(response_2.data["results"][0]["shares_count"], 1)

    def test_cache_invalidated_after_block(self):
        # یه user دیگه که پست داره
        user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        Post.objects.create(
            slug="b-post",
            title="B Post",
            content="Content",
            author=user_b,
        )

        # ۱. cache رو پر کن — باید ۲ پست ببینی
        response_1 = self.client.get("/posts/")
        self.assertEqual(response_1.data["count"], 2)

        # ۲. B رو بلاک کن
        self.client.post(
            "/posts/blocks/",
            data={"target_email": "b@test.com"},
            format="json",
        )

        # ۳. باید فقط ۱ پست ببینی
        response_2 = self.client.get("/posts/")
        self.assertEqual(response_2.data["count"], 1)


class NotificationAPITests(APITestCase):

    def setUp(self):
        self.user = BaseUser.objects.create_user(
            email="a@test.com", password="pass1234",
        )
        self.actor = BaseUser.objects.create_user(
            email="b@test.com", password="pass1234",
        )
        self.client.force_authenticate(user=self.user)

    def test_list_notifications_empty(self):
        response = self.client.get("/posts/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_list_notifications_with_reply_story(self):
        """مهم: چک می‌کنه target_conversation_id توی خروجی هست."""
        from datetime import timedelta
        from django.utils import timezone
        from posts.models import Story, Notification, Conversation

        story = Story.objects.create(
            author=self.user, text="hi",
            expires_at=timezone.now() + timedelta(hours=24),
        )
        conv = Conversation.objects.create(
            user_a=min(self.user, self.actor, key=lambda u: u.id),
            user_b=max(self.user, self.actor, key=lambda u: u.id),
        )
        Notification.objects.create(
            recipient=self.user, actor=self.actor,
            verb="reply_story", target_story=story,
            target_conversation=conv,
        )

        response = self.client.get("/posts/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["target_conversation_id"], conv.id)
