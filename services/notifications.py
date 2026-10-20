import logging

from posts.models import (
    Notification,
    Post,
    Comment,
    Story,
    Conversation,
    Message,
)
from users.models import BaseUser

logger = logging.getLogger(__name__)


def _is_conversation_muted(conversation, user) -> bool:
    """آیا این کاربر مکالمه رو mute کرده؟"""
    from posts.models import ConversationSettings
    return ConversationSettings.objects.filter(
        conversation=conversation,
        user=user,
        is_muted=True,
    ).exists()


# ============================================================
# Helpers
# ============================================================

def _should_notify(actor: BaseUser, recipient: BaseUser) -> bool:
    """Don't notify if actor == recipient."""
    return actor.id != recipient.id


# ============================================================
# Post / Comment
# ============================================================

def notify_like_post(actor: BaseUser, post: Post) -> Notification | None:
    if not _should_notify(actor, post.author):
        return None

    return Notification.objects.create(
        recipient=post.author,
        actor=actor,
        verb="like_post",
        target_post=post,
    )


def notify_comment_post(
        actor: BaseUser,
        post: Post,
        comment: Comment,
) -> Notification | None:
    if not _should_notify(actor, post.author):
        return None

    return Notification.objects.create(
        recipient=post.author,
        actor=actor,
        verb="comment_post",
        target_post=post,
        target_comment=comment,
    )


def notify_reply_comment(
        actor: BaseUser,
        post: Post,
        comment: Comment,
        parent: Comment,
) -> Notification | None:
    if not _should_notify(actor, parent.user):
        return None

    return Notification.objects.create(
        recipient=parent.user,
        actor=actor,
        verb="reply_comment",
        target_post=post,
        target_comment=comment,
    )


def notify_like_comment(
        actor: BaseUser,
        comment: Comment,
) -> Notification | None:
    if not _should_notify(actor, comment.user):
        return None

    return Notification.objects.create(
        recipient=comment.user,
        actor=actor,
        verb="like_comment",
        target_post=comment.post,
        target_comment=comment,
    )


# ============================================================
# Follow
# ============================================================

def notify_follow(
        actor: BaseUser,
        target: BaseUser,
) -> Notification | None:
    if not _should_notify(actor, target):
        return None

    return Notification.objects.create(
        recipient=target,
        actor=actor,
        verb="follow",
    )


# ============================================================
# Story
# ============================================================

def notify_react_story(
        actor: BaseUser,
        story: Story,
        conversation: Conversation,
) -> Notification | None:
    if not _should_notify(actor, story.author):
        return None

    return Notification.objects.create(
        recipient=story.author,
        actor=actor,
        verb="react_story",
        target_story=story,
        target_conversation=conversation,
    )


def notify_reply_story(
        actor: BaseUser,
        story: Story,
        conversation: Conversation,
) -> Notification | None:
    if not _should_notify(actor, story.author):
        return None

    return Notification.objects.create(
        recipient=story.author,
        actor=actor,
        verb="reply_story",
        target_story=story,
        target_conversation=conversation,
    )


# ============================================================
# Message (DM)
# ============================================================

def notify_react_message(actor, message):
    if not _should_notify(actor, message.sender):
        return None

    # ← جدید
    if _is_conversation_muted(message.conversation, message.sender):
        return None

    return Notification.objects.create(
        recipient=message.sender,
        actor=actor,
        verb="react_message",
        target_conversation=message.conversation,
    )


def notify_reply_message(actor, message):
    if message.reply_to is None:
        return None

    if not _should_notify(actor, message.reply_to.sender):
        return None

    # ← جدید
    if _is_conversation_muted(message.conversation, message.reply_to.sender):
        return None

    return Notification.objects.create(
        recipient=message.reply_to.sender,
        actor=actor,
        verb="reply_message",
        target_conversation=message.conversation,
    )


def notify_mention(
        actor: BaseUser,
        recipient: BaseUser,
        post: Post = None,
        comment: Comment = None,
) -> Notification | None:
    """وقتی کاربری توی پست/کامنت mention شد."""
    if not _should_notify(actor, recipient):
        return None

    verb = "mention_comment" if comment else "mention_post"

    return Notification.objects.create(
        recipient=recipient,
        actor=actor,
        verb=verb,
        target_post=post,
        target_comment=comment,
    )


# ============================================================
# Bulk
# ============================================================

def mark_all_as_read(user: BaseUser) -> int:
    updated = (
        Notification.objects
        .filter(recipient=user, is_read=False)
        .update(is_read=True)
    )
    return updated
