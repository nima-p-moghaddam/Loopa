from django.core.cache import cache
from django.test import TestCase, override_settings

from services.posts_cache import (
    make_posts_list_cache_key,
    get_cached_posts_list,
    set_cached_posts_list,
    invalidate_posts_list_cache,
    VERSION_KEY,
)


@override_settings(CACHES={
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
})
class PostsCacheTests(TestCase):

    def setUp(self):
        cache.clear()

    def test_cache_key_same_for_same_filters(self):
        key_1 = make_posts_list_cache_key({"title": "django"})
        key_2 = make_posts_list_cache_key({"title": "django"})

        self.assertEqual(key_1, key_2)

    def test_cache_key_differs_for_different_filters(self):
        key_1 = make_posts_list_cache_key({"title": "django"})
        key_2 = make_posts_list_cache_key({"title": "python"})

        self.assertNotEqual(key_1, key_2)

    def test_cache_key_with_no_filters(self):
        key = make_posts_list_cache_key({})

        # باید با "all" ساخته بشه (hash از "all")
        self.assertIsNotNone(key)
        self.assertIn("v", key)  # فرمت: posts_list:v{version}:{digest}

    def test_set_and_get_cached_list(self):
        filters = {"title": "django"}
        data = {"count": 1, "results": [{"slug": "post-1"}]}

        # قبل از set، خالیه
        self.assertIsNone(get_cached_posts_list(filters))

        set_cached_posts_list(filters, data)

        # بعد از set، همون داده برمی‌گرده
        cached = get_cached_posts_list(filters)
        self.assertEqual(cached, data)

    def test_invalidate_bumps_version(self):
        filters = {"title": "django"}
        data = {"count": 1}

        # set اول
        set_cached_posts_list(filters, data)

        # version اول
        version_1 = cache.get(VERSION_KEY)

        # invalidate
        invalidate_posts_list_cache()

        # version دوم
        version_2 = cache.get(VERSION_KEY)

        self.assertEqual(version_2, version_1 + 1)

    def test_key_changes_after_invalidate(self):
        filters = {"title": "django"}

        key_1 = make_posts_list_cache_key(filters)

        invalidate_posts_list_cache()

        key_2 = make_posts_list_cache_key(filters)

        self.assertNotEqual(key_1, key_2)

    def test_old_data_not_returned_after_invalidate(self):
        filters = {"title": "django"}
        data = {"count": 1}

        set_cached_posts_list(filters, data)
        invalidate_posts_list_cache()

        # بعد از invalidate، get باید None برگردونه
        cached = get_cached_posts_list(filters)
        self.assertIsNone(cached)

    def test_cache_key_differs_for_different_users(self):
        key_user_1 = make_posts_list_cache_key({"title": "x"}, user_id=1)
        key_user_2 = make_posts_list_cache_key({"title": "x"}, user_id=2)

        self.assertNotEqual(key_user_1, key_user_2)

    def test_cache_key_same_for_same_user(self):
        key_1 = make_posts_list_cache_key({"title": "x"}, user_id=1)
        key_2 = make_posts_list_cache_key({"title": "x"}, user_id=1)

        self.assertEqual(key_1, key_2)

    def test_cache_key_anonymous_vs_user(self):
        key_anon = make_posts_list_cache_key({"title": "x"})
        key_user = make_posts_list_cache_key({"title": "x"}, user_id=1)

        self.assertNotEqual(key_anon, key_user)
