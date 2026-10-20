from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import BaseUser


class JWTAuthTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.user = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )

    def _login(self, email="a@test.com", password="pass1234"):
        return self.client.post(
            "/auth/jwt/login/",
            data={"email": email, "password": password},
            format="json",
        )

    def test_login_success(self):
        response = self._login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_wrong_password(self):
        response = self._login(password="wrongpass")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access", response.data)

    def test_login_nonexistent_email(self):
        response = self._login(email="nobody@test.com")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_success(self):
        login_response = self._login()
        refresh = login_response.data["refresh"]

        response = self.client.post(
            "/auth/jwt/refresh/",
            data={"refresh": refresh},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        # چون ROTATE_REFRESH_TOKENS=True، refresh جدید هم می‌گیریم
        self.assertIn("refresh", response.data)

    def test_refresh_old_token_blacklisted_after_rotation(self):
        login_response = self._login()
        old_refresh = login_response.data["refresh"]

        # اول refresh
        self.client.post(
            "/auth/jwt/refresh/",
            data={"refresh": old_refresh},
            format="json",
        )

        # حالا همون refresh قدیمی رو دوباره امتحان کن
        response = self.client.post(
            "/auth/jwt/refresh/",
            data={"refresh": old_refresh},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_invalid_token(self):
        response = self.client.post(
            "/auth/jwt/refresh/",
            data={"refresh": "not-a-real-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_verify_success(self):
        login_response = self._login()
        access = login_response.data["access"]

        response = self.client.post(
            "/auth/jwt/verify/",
            data={"token": access},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_verify_invalid_token(self):
        response = self.client.post(
            "/auth/jwt/verify/",
            data={"token": "invalid-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_cannot_be_used_as_refresh(self):
        login_response = self._login()
        access = login_response.data["access"]

        response = self.client.post(
            "/auth/jwt/refresh/",
            data={"refresh": access},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)