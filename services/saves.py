from django.core.exceptions import ValidationError

from posts.models import Post, Save
from services.blocks import is_blocked, get_blocked_user_ids
from services.posts_cache import invalidate_posts_list_cache
from users.models import BaseUser


def create_save(user: BaseUser, post: Post) -> Save:
    if is_blocked(user, post.author):
        raise ValidationError("You cannot save this post.")

    save = Save(user=user, post=post)
    save.full_clean()
    save.save()

    invalidate_posts_list_cache()  # ← جدید

    return save


def delete_save(save: Save) -> None:
    save.delete()

    invalidate_posts_list_cache()  # ← جدید


def get_user_saves(user: BaseUser):
    blocked_ids = get_blocked_user_ids(user)

    return (
        Save.objects
        .filter(user=user)
        .exclude(post__author_id__in=blocked_ids)
        .select_related("post__author")
        .order_by("-created_at")
    )
