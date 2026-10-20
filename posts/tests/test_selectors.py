from django.test import TestCase

from posts.models import Post
from query_selectors.posts import get_posts
from users.models import BaseUser


class GetPostsSelectorTests(TestCase):

    def setUp(self):
        self.user_a = BaseUser.objects.create_user(
            email="a@test.com",
            password="pass1234",
        )
        self.user_b = BaseUser.objects.create_user(
            email="b@test.com",
            password="pass1234",
        )

    def test_returns_all_posts_ordered_by_created_at_desc(self):
        post_1 = Post.objects.create(
            slug="post-1",
            title="Post 1",
            content="Content 1",
            author=self.user_a,
        )
        post_2 = Post.objects.create(
            slug="post-2",
            title="Post 2",
            content="Content 2",
            author=self.user_a,
        )

        posts = list(get_posts())

        self.assertEqual(len(posts), 2)
        # جدیدترین اول
        self.assertEqual(posts[0].slug, "post-2")
        self.assertEqual(posts[1].slug, "post-1")

    def test_filter_by_title(self):
        Post.objects.create(
            slug="post-1",
            title="Django Tutorial",
            content="Content",
            author=self.user_a,
        )
        Post.objects.create(
            slug="post-2",
            title="Python Basics",
            content="Content",
            author=self.user_a,
        )

        posts = list(get_posts(filters={"title": "django"}))

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0].title, "Django Tutorial")

    def test_filter_by_slug(self):
        Post.objects.create(
            slug="my-post",
            title="Title",
            content="Content",
            author=self.user_a,
        )
        Post.objects.create(
            slug="other-post",
            title="Other",
            content="Content",
            author=self.user_a,
        )

        posts = list(get_posts(filters={"slug": "my-post"}))

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0].slug, "my-post")

    def test_filter_by_content(self):
        Post.objects.create(
            slug="post-1",
            title="Title 1",
            content="Something about Django ORM",
            author=self.user_a,
        )
        Post.objects.create(
            slug="post-2",
            title="Title 2",
            content="Something about React",
            author=self.user_a,
        )

        posts = list(get_posts(filters={"content": "django"}))

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0].slug, "post-1")

    def test_combined_filters(self):
        Post.objects.create(
            slug="post-1",
            title="Django Tutorial",
            content="Django ORM",
            author=self.user_a,
        )
        Post.objects.create(
            slug="post-2",
            title="Django Advanced",
            content="Django Caching",
            author=self.user_a,
        )

        posts = list(get_posts(filters={
            "title": "tutorial",
            "content": "orm",
        }))

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0].slug, "post-1")

    def test_search_full_text(self):
        Post.objects.create(
            slug="post-1",
            title="Learning Django",
            content="Django is a web framework",
            author=self.user_a,
        )
        Post.objects.create(
            slug="post-2",
            title="Learning Python",
            content="Python is a language",
            author=self.user_a,
        )

        posts = list(get_posts(filters={"search": "django"}))

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0].slug, "post-1")

    def test_query_count_is_constant(self):
        # ۵ تا پست با ۲ تا author مختلف
        Post.objects.create(
            slug="post-1",
            title="Post 1",
            content="Content",
            author=self.user_a,
        )
        Post.objects.create(
            slug="post-2",
            title="Post 2",
            content="Content",
            author=self.user_a,
        )
        Post.objects.create(
            slug="post-3",
            title="Post 3",
            content="Content",
            author=self.user_b,
        )
        Post.objects.create(
            slug="post-4",
            title="Post 4",
            content="Content",
            author=self.user_b,
        )
        Post.objects.create(
            slug="post-5",
            title="Post 5",
            content="Content",
            author=self.user_a,
        )

        # ۱ کوئری برای همه پست‌ها + join با author (select_related)
        with self.assertNumQueries(2):
            posts = list(get_posts())
            for post in posts:
                _ = post.author.email


class SearchRankingTests(TestCase):

    def setUp(self):
        self.user = BaseUser.objects.create_user(
            email="a@test.com", password="pass1234",
        )

    def _make_post(self, slug, title, content):
        return Post.objects.create(
            slug=slug, title=title, content=content, author=self.user,
        )

    # ---------- Ranking ----------

    def test_ranking_prefers_more_matches(self):
        """پستی که کلمه رو چند بار داره، بالاتر از پستی که یه بار داره."""
        # پست ۱: یه بار
        self._make_post("p1", "Django basics", "A short intro")

        # پست ۲: چند بار
        self._make_post(
            "p2",
            "Django ORM Django admin Django",
            "Django Django Django",
        )

        # پست ۱ اول ساخته شد، ولی پست ۲ باید اول بیاد (match بیشتر)
        posts = list(get_posts(filters={"search": "django"}))
        self.assertEqual(len(posts), 2)
        self.assertEqual(posts[0].slug, "p2")
        self.assertEqual(posts[1].slug, "p1")

    def test_ranking_orders_by_relevance_not_created_at(self):
        """پست قدیمی‌تر ولی مرتبط‌تر، بالاتر از پست جدید ولی نامرتبط."""
        # پست قدیمی: دقیقا match
        self._make_post("old", "Python search", "advanced python search")

        # پست جدید ولی نامرتبط
        self._make_post("new", "Unrelated", "no keyword here at all")

        posts = list(get_posts(filters={"search": "python search"}))
        self.assertEqual(posts[0].slug, "old")

    # ---------- websearch_to_tsquery syntax ----------

    def test_websearch_exclude(self):
        """syntax -exclude کار می‌کنه"""
        self._make_post("p1", "Django and Flask", "python web")
        self._make_post("p2", "Django only", "python web")

        posts = list(get_posts(filters={"search": "django -flask"}))
        slugs = {p.slug for p in posts}
        self.assertEqual(slugs, {"p2"})

    def test_websearch_quoted_phrase(self):
        """syntax "quoted phrase" کار می‌کنه"""
        self._make_post("p1", "Web framework", "django web framework")
        self._make_post("p2", "Random text", "web stuff")

        posts = list(get_posts(filters={"search": '"web framework"'}))
        slugs = {p.slug for p in posts}
        self.assertEqual(slugs, {"p1"})

    def test_websearch_or(self):
        """syntax OR کار می‌کنه"""
        self._make_post("p1", "Django tutorial", "x")
        self._make_post("p2", "Flask tutorial", "x")
        self._make_post("p3", "Ruby tutorial", "x")

        posts = list(get_posts(filters={"search": "django OR flask"}))
        slugs = {p.slug for p in posts}
        self.assertEqual(slugs, {"p1", "p2"})

    # ---------- Trigram fallback ----------

    def test_trigram_fallback_for_typo(self):
        """typo در title → trigram fallback می‌گیره"""
        self._make_post("p1", "Django tutorial", "content")

        # typo در جستجو
        posts = list(get_posts(filters={"search": "djangoo"}))
        self.assertGreaterEqual(len(posts), 1)
        self.assertEqual(posts[0].slug, "p1")

    def test_no_match_returns_empty(self):
        self._make_post("p1", "Hello world", "content")

        posts = list(get_posts(filters={"search": "zzzzzzzzz"}))
        self.assertEqual(len(posts), 0)

    # ---------- Empty / whitespace ----------

    def test_empty_search_returns_all(self):
        self._make_post("p1", "Post one", "content")
        self._make_post("p2", "Post two", "content")

        posts = list(get_posts(filters={"search": ""}))
        self.assertEqual(len(posts), 2)

    def test_whitespace_search_returns_all(self):
        self._make_post("p1", "Post one", "content")
        self._make_post("p2", "Post two", "content")

        posts = list(get_posts(filters={"search": "   "}))
        self.assertEqual(len(posts), 2)

    # ---------- Combined filters ----------

    def test_search_and_title_filter_combined(self):
        self._make_post("p1", "Django basics", "content")
        self._make_post("p2", "Django advanced", "content")
        self._make_post("p3", "Flask basics", "content")

        # search=django AND title contains "basics"
        posts = list(get_posts(filters={
            "search": "django",
            "title": "basics",
        }))
        slugs = {p.slug for p in posts}
        self.assertEqual(slugs, {"p1"})
