from django.db.models import F

from posts.models import Like, Post
from services.posts_cache import invalidate_posts_list_cache
from services.notifications import notify_like_post
from users.models import BaseUser


def create_like(user: BaseUser, post: Post) -> Like:
    like = Like(user=user, post=post)
    like.full_clean()
    like.save()

    Post.objects.filter(slug=post.slug).update(
        likes_count=F("likes_count") + 1
    )

    invalidate_posts_list_cache()

    # Notification
    notify_like_post(actor=user, post=post)

    return like


def delete_like(like: Like) -> None:
    post = like.post

    like.delete()

    Post.objects.filter(slug=post.slug).update(
        likes_count=F("likes_count") - 1
    )

    invalidate_posts_list_cache()  # ← جدید
