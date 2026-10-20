import django_filters

from posts.models import Post


class PostFilter(django_filters.FilterSet):

    title = django_filters.CharFilter(
        field_name="title",
        lookup_expr="icontains",
    )

    content = django_filters.CharFilter(
        field_name="content",
        lookup_expr="icontains",
    )

    slug = django_filters.CharFilter(
        field_name="slug",
        lookup_expr="iexact",
    )

    class Meta:
        model = Post
        fields = (
            "title",
            "content",
            "slug",
        )