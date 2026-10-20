from django.db.models import QuerySet
from django.db.models.expressions import RawSQL

from posts.models import Post
from query_selectors.filters import PostFilter
from users.models import BaseUser


def get_posts(
        filters: dict | None = None,
) -> QuerySet[Post]:
    queryset = (
        Post.objects
        .select_related("author")
        .order_by("-created_at")
    )

    if not filters:
        return queryset

    filters = dict(filters)
    search = filters.pop("search", None)

    if search:
        if isinstance(search, (list, tuple)):
            search = search[0]

        queryset = queryset.annotate(
            _search_match=RawSQL(
                "posts_post.search_vector @@ plainto_tsquery('english', %s)",
                [search],
            ),
        ).filter(_search_match=True)

    if filters:
        queryset = PostFilter(
            data=filters,
            queryset=queryset,
        ).qs

    return queryset


def get_feed_posts(user: BaseUser) -> QuerySet[Post]:
    return (
        Post.objects
        .filter(author__subscribers__subscriber=user)
        .select_related("author")
        .order_by("-created_at")
    )