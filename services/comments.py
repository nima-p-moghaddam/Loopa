from django.core.exceptions import ValidationError
from django.db.models import F
from services.notifications import (
    notify_comment_post,
    notify_reply_comment,
)
from posts.models import Comment, Post
from services.blocks import is_blocked
from services.posts_cache import invalidate_posts_list_cache
from users.models import BaseUser


def create_comment(
        user: BaseUser,
        post: Post,
        content: str,
        parent: Comment | None = None,
) -> Comment:
    if is_blocked(user, post.author):
        raise ValidationError("You cannot comment on this post.")

    if parent is not None and parent.post_id != post.slug:
        raise ValidationError("Parent comment does not belong to this post.")

    comment = Comment(
        user=user,
        post=post,
        content=content,
        parent=parent,
    )
    comment.full_clean()
    comment.save()

    Post.objects.filter(slug=post.slug).update(
        comments_count=F("comments_count") + 1
    )

    invalidate_posts_list_cache()

    # Notification
    if parent is None:
        notify_comment_post(actor=user, post=post, comment=comment)
    else:
        notify_reply_comment(
            actor=user,
            post=post,
            comment=comment,
            parent=parent,
        )

    return comment


def update_comment(comment: Comment, content: str) -> Comment:
    comment.content = content
    comment.full_clean()
    comment.save(update_fields=["content", "updated_at"])

    return comment


def delete_comment(comment: Comment) -> None:
    post = comment.post

    comment.delete()

    # CASCADE ممکنه چند کامنت رو پاک کنه، پس recalculate
    remaining_count = Comment.objects.filter(post=post).count()

    Post.objects.filter(slug=post.slug).update(
        comments_count=remaining_count
    )

    invalidate_posts_list_cache()
