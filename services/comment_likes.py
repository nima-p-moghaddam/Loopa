from django.db.models import F
from services.notifications import notify_like_comment

from posts.models import Comment, CommentLike
from users.models import BaseUser


def create_comment_like(user: BaseUser, comment: Comment) -> CommentLike:
    like = CommentLike(user=user, comment=comment)
    like.full_clean()
    like.save()

    Comment.objects.filter(id=comment.id).update(
        likes_count=F("likes_count") + 1
    )

    # Notification
    notify_like_comment(actor=user, comment=comment)

    return like


def delete_comment_like(like: CommentLike) -> None:
    comment = like.comment

    like.delete()

    Comment.objects.filter(id=comment.id).update(
        likes_count=F("likes_count") - 1
    )
