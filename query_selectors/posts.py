from django.db.models import (
    QuerySet, Exists, OuterRef, Value, BooleanField, Q, FloatField,
)
from django.db.models.expressions import RawSQL
from django.contrib.postgres.search import TrigramSimilarity

from posts.models import Post, Like, Save
from query_selectors.filters import PostFilter
from services.blocks import get_blocked_user_ids
from users.models import BaseUser

# ---------- thresholdها ----------
TRIGRAM_THRESHOLD = 0.25


def _add_annotations(queryset: QuerySet, user: BaseUser | None) -> QuerySet:
    """Add _is_liked and _is_saved annotations based on current user."""
    if user and user.is_authenticated:
        return queryset.annotate(
            _is_liked=Exists(
                Like.objects.filter(user=user, post=OuterRef("pk"))
            ),
            _is_saved=Exists(
                Save.objects.filter(user=user, post=OuterRef("pk"))
            ),
        )
    return queryset.annotate(
        _is_liked=Value(False, output_field=BooleanField()),
        _is_saved=Value(False, output_field=BooleanField()),
    )


def _apply_search(queryset: QuerySet, term: str) -> QuerySet:
    """
    Full-text search با ranking.
    اگه FTS نتیجه داد → برگردون.
    اگه نه → fallback به trigram (برای typo).
    """
    fts_match = RawSQL(
        "posts_post.search_vector @@ websearch_to_tsquery('english', %s)",
        [term],
    )
    fts_rank = RawSQL(
        "ts_rank(posts_post.search_vector, websearch_to_tsquery('english', %s))",
        [term],
        output_field=FloatField(),
    )

    base = queryset.annotate(
        _fts_match=fts_match,
        _fts_rank=fts_rank,
        _similarity=TrigramSimilarity("title", term),
    )

    fts_qs = base.filter(_fts_match=True)

    # ۱. اگه FTS نتیجه داد، با ranking برگردون
    if fts_qs.exists():
        return fts_qs.order_by("-_fts_rank", "-created_at")

    # ۲. fallback به trigram (فقط برای typo)
    return (
        base
        .filter(_similarity__gt=TRIGRAM_THRESHOLD)
        .order_by("-_similarity", "-created_at")
    )


def get_posts(
        user: BaseUser | None = None,
        filters: dict | None = None,
) -> QuerySet[Post]:
    queryset = (
        Post.objects
        .select_related("author", "author__profile")
        .prefetch_related("images")
        .order_by("-created_at")
    )

    # فیلتر Block
    if user and user.is_authenticated:
        blocked_ids = get_blocked_user_ids(user)
        if blocked_ids:
            queryset = queryset.exclude(author_id__in=blocked_ids)

    # Annotations
    queryset = _add_annotations(queryset, user)

    if not filters:
        return queryset

    filters = dict(filters)
    search = filters.pop("search", None)

    if search:
        if isinstance(search, (list, tuple)):
            search = search[0]
        search = (search or "").strip()

        if search:
            queryset = _apply_search(queryset, search)

    if filters:
        queryset = PostFilter(
            data=filters,
            queryset=queryset,
        ).qs

    return queryset


def get_feed_posts(user: BaseUser) -> QuerySet[Post]:
    queryset = (
        Post.objects
        .filter(author__subscribers__subscriber=user)
        .select_related("author", "author__profile")
        .prefetch_related("images")
        .order_by("-created_at")
    )

    blocked_ids = get_blocked_user_ids(user)
    if blocked_ids:
        queryset = queryset.exclude(author_id__in=blocked_ids)

    queryset = _add_annotations(queryset, user)

    return queryset


def get_visible_post(user, slug):
    """Returns a post by slug, respecting block filters."""
    queryset = (
        Post.objects
        .filter(slug=slug)
        .select_related("author", "author__profile")
        .prefetch_related("images")
    )

    if user and user.is_authenticated:
        blocked_ids = get_blocked_user_ids(user)
        if blocked_ids:
            queryset = queryset.exclude(author_id__in=blocked_ids)

    queryset = _add_annotations(queryset, user)

    return queryset.first()


def get_user_posts(
        viewer: BaseUser | None,
        target_user_id: int,
) -> QuerySet[Post]:
    queryset = (
        Post.objects
        .filter(author_id=target_user_id)
        .select_related("author", "author__profile")
        .prefetch_related("images")
        .order_by("-created_at")
    )

    if viewer and viewer.is_authenticated:
        blocked_ids = get_blocked_user_ids(viewer)
        if target_user_id in blocked_ids:
            return Post.objects.none()
        if blocked_ids:
            queryset = queryset.exclude(author_id__in=blocked_ids)

    queryset = _add_annotations(queryset, viewer)

    return queryset


def get_posts_by_hashtag(
        user: BaseUser | None,
        hashtag,
) -> QuerySet[Post]:
    """پست‌های یه hashtag مشخص، با فیلتر block."""
    queryset = (
        Post.objects
        .filter(hashtags=hashtag)
        .select_related("author", "author__profile")
        .prefetch_related("images")
        .order_by("-created_at")
    )

    if user and user.is_authenticated:
        blocked_ids = get_blocked_user_ids(user)
        if blocked_ids:
            queryset = queryset.exclude(author_id__in=blocked_ids)

    queryset = _add_annotations(queryset, user)

    return queryset
