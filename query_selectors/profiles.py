from django.contrib.postgres.search import (
    SearchVector,
    SearchQuery,
    SearchRank,
    TrigramSimilarity,
)
from django.db.models import Exists, OuterRef, Q

from posts.models import Subscription
from services.blocks import is_blocked, get_blocked_user_ids
from users.models import BaseUser, Profile


def get_profile(viewer: BaseUser | None, user_id: int) -> Profile:
    profile = (
        Profile.objects
        .select_related("user")
        .get(user_id=user_id)
    )

    if viewer and viewer.is_authenticated:
        if is_blocked(viewer, profile.user):
            raise Profile.DoesNotExist()

    return profile


def get_profile_by_page_name(
        viewer: BaseUser | None,
        page_name: str,
) -> Profile:
    profile = (
        Profile.objects
        .select_related("user")
        .get(page_name=page_name.lower())
    )

    if viewer and viewer.is_authenticated:
        if is_blocked(viewer, profile.user):
            raise Profile.DoesNotExist()

    return profile


# ============================================================
# Search Users — FTS + Trigram + Ranking
# ============================================================

def search_users(
        viewer: BaseUser | None,
        query: str,
        limit: int = 20,
):
    """
    جستجوی کاربران با:
    - Exact match (بالاترین اولویت)
    - FTS روی page_name + full_name
    - Trigram similarity (typo tolerance)
    - Substring fallback

    Ranking:
    1. SearchRank (وزن A برای page_name، B برای full_name)
    2. TrigramSimilarity
    3. subscriber_count
    """
    query = (query or "").strip()
    if not query:
        return Profile.objects.none()

    qs = (
        Profile.objects
        .filter(page_name__isnull=False)
        .select_related("user")
    )

    # فیلتر Block + self
    if viewer and viewer.is_authenticated:
        qs = qs.exclude(user_id=viewer.id)

        blocked_ids = get_blocked_user_ids(viewer)
        if blocked_ids:
            qs = qs.exclude(user_id__in=blocked_ids)

    # Annotations
    vector = (
        SearchVector("page_name", weight="A", config="simple")
        + SearchVector("full_name", weight="B", config="simple")
    )
    search_query = SearchQuery(
        query,
        search_type="websearch",
        config="simple",
    )

    qs = qs.annotate(
        _search=vector,
        _rank=SearchRank(vector, search_query),
        _trgm_page=TrigramSimilarity("page_name", query),
        _trgm_full=TrigramSimilarity("full_name", query),
    )

    # Filter: هر کدوم از این‌ها کافیه
    qs = qs.filter(
        Q(_rank__gt=0.01)
        | Q(_trgm_page__gt=0.15)
        | Q(_trgm_full__gt=0.15)
        | Q(page_name__icontains=query)
        | Q(full_name__icontains=query)
    )

    # Ranking
    qs = qs.order_by(
        "-_rank",
        "-_trgm_page",
        "-_trgm_full",
        "-subscriber_count",
        "page_name",
    )

    return qs[:limit]


def get_suggested_users(
        viewer: BaseUser,
        limit: int = 5,
):
    subscribed_ids = Subscription.objects.filter(
        subscriber=viewer
    ).values_list("target_id", flat=True)

    blocked_ids = get_blocked_user_ids(viewer)

    qs = (
        Profile.objects
        .filter(page_name__isnull=False)
        .exclude(user_id=viewer.id)
        .exclude(user_id__in=subscribed_ids)
        .select_related("user")
    )

    if blocked_ids:
        qs = qs.exclude(user_id__in=blocked_ids)

    return qs.order_by("-subscriber_count", "page_name")[:limit]


def _annotate_is_subscribed(qs, viewer):
    if viewer and viewer.is_authenticated:
        return qs.annotate(
            _is_subscribed=Exists(
                Subscription.objects.filter(
                    subscriber=viewer, target=OuterRef("user"),
                )
            ),
        )
    return qs


def get_followers(
        viewer: BaseUser | None,
        user_id: int,
        limit: int = 100,
):
    subscriber_ids = Subscription.objects.filter(
        target_id=user_id
    ).values_list("subscriber_id", flat=True)

    qs = (
        Profile.objects
        .filter(user_id__in=subscriber_ids)
        .select_related("user")
    )

    if viewer and viewer.is_authenticated:
        blocked_ids = get_blocked_user_ids(viewer)
        if blocked_ids:
            qs = qs.exclude(user_id__in=blocked_ids)

    qs = _annotate_is_subscribed(qs, viewer)

    return qs.order_by("-subscriber_count")[:limit]


def get_following(
        viewer: BaseUser | None,
        user_id: int,
        limit: int = 100,
):
    target_ids = Subscription.objects.filter(
        subscriber_id=user_id
    ).values_list("target_id", flat=True)

    qs = (
        Profile.objects
        .filter(user_id__in=target_ids)
        .select_related("user")
    )

    if viewer and viewer.is_authenticated:
        blocked_ids = get_blocked_user_ids(viewer)
        if blocked_ids:
            qs = qs.exclude(user_id__in=blocked_ids)

    qs = _annotate_is_subscribed(qs, viewer)

    return qs.order_by("-subscriber_count")[:limit]