from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from posts.models import Post
from users.models import BaseUser


@override_settings(CACHES={
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
})
class ExceptionHandlerTests(APITestCase):

    def setUp(self):
        self.user = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user)

    def test_not_found_error_format(self):
        response = self.client.delete(
            "/posts/",
            data={"slug": "no-such-post"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "not_found")
        self.assertEqual(response.data["message"], "Post not found.")
        self.assertIsNone(response.data["details"])

    def test_validation_error_format(self):
        response = self.client.post(
            "/posts/",
            data={"slug": "only-slug"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "validation_error")
        self.assertEqual(response.data["message"], "Invalid input.")
        self.assertIsNotNone(response.data["details"])
        self.assertIn("title", response.data["details"])
        self.assertIn("content", response.data["details"])

    def test_permission_denied_format(self):
        other_user = BaseUser.objects.create_user(
            email="b@test.com",
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
        self.assertEqual(response.data["error"], "permission_denied")
        self.assertIn("permission", response.data["message"].lower())

    def test_not_authenticated_format(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/posts/feed/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "not_authenticated")
        self.assertIsNone(response.data["details"])