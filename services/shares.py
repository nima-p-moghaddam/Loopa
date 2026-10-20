from django.core.exceptions import ValidationError
from django.db.models import F

from posts.models import Post, Share
from services.blocks import is_blocked
from services.posts_cache import invalidate_posts_list_cache
from users.models import BaseUser


def create_share(
    user: BaseUser,
    post: Post,
    comment: str | None = None,
) -> Share:
    if is_blocked(user, post.author):
        raise ValidationError("You cannot share this post.")

    share = Share(
        user=user,
        post=post,
        comment=comment,
    )
    share.full_clean()
    share.save()

    Post.objects.filter(slug=post.slug).update(
        shares_count=F("shares_count") + 1
    )

    invalidate_posts_list_cache()

    return share


def delete_share(share: Share) -> None:
    post = share.post

    share.delete()

    Post.objects.filter(slug=post.slug).update(
        shares_count=F("shares_count") - 1
    )

    invalidate_posts_list_cache()


def get_user_shares(user: BaseUser):
    return (
        Share.objects
        .filter(user=user)
        .select_related("post__author")
        .order_by("-created_at")
    )