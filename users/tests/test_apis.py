from rest_framework import status
from rest_framework.test import APITestCase

from users.models import BaseUser


class ProfileAPITests(APITestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )
        self.client.force_authenticate(user=self.user_a)

    def test_patch_own_profile_success(self):
        response = self.client.patch(
            f"/users/{self.user_a.id}/profile/",
            data={"bio": "My new bio"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user_a.profile.refresh_from_db()
        self.assertEqual(self.user_a.profile.bio, "My new bio")

    def test_patch_other_user_profile_forbidden(self):
        response = self.client.patch(
            f"/users/{self.user_b.id}/profile/",
            data={"bio": "Hacked"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.user_b.profile.refresh_from_db()
        self.assertNotEqual(self.user_b.profile.bio, "Hacked")

    def test_patch_profile_unauthenticated(self):
        self.client.force_authenticate(user=None)

        response = self.client.patch(
            f"/users/{self.user_a.id}/profile/",
            data={"bio": "Anonymous edit"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)