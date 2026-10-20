from django.db.models import QuerySet

from posts.models import Notification
from services.blocks import get_blocked_user_ids
from users.models import BaseUser


def get_user_notifications(
        user: BaseUser,
        limit: int = 50,
) -> QuerySet[Notification]:
    """
    Returns notifications for a user, respecting blocks.
    Excludes notifications from blocked users or about blocked content.
    """
    blocked_ids = get_blocked_user_ids(user)

    qs = (
        Notification.objects
        .filter(recipient=user)
        .select_related(
            "actor",
            "actor__profile",
            "target_post",
            "target_comment",
            "target_story",
            "target_conversation",
        )
    )

    if blocked_ids:
        qs = qs.exclude(actor_id__in=blocked_ids)
        qs = qs.exclude(target_post__author_id__in=blocked_ids)
        qs = qs.exclude(target_comment__user_id__in=blocked_ids)

    return qs.order_by("-created_at")[:limit]


def get_unread_count(user: BaseUser) -> int:
    """Number of unread notifications for a user."""
    blocked_ids = get_blocked_user_ids(user)

    qs = Notification.objects.filter(recipient=user, is_read=False)

    if blocked_ids:
        qs = qs.exclude(actor_id__in=blocked_ids)
        qs = qs.exclude(target_post__author_id__in=blocked_ids)

    return qs.count()


def notify_reply_story(actor, story, conversation):
    if not _should_notify(actor, story.author):
        return None

    return Notification.objects.create(
        recipient=story.author,
        actor=actor,
        verb="reply_story",
        target_story=story,
        target_conversation=conversation,
    )


def notify_react_story(actor, story, conversation):
    if not _should_notify(actor, story.author):
        return None

    return Notification.objects.create(
        recipient=story.author,
        actor=actor,
        verb="react_story",
        target_story=story,
        target_conversation=conversation,
    )
