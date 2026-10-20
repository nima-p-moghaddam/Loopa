from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction  # ← جدید
from django.db.models import Count
from django.utils import timezone  # ← این خط
from services.notifications import (
    notify_react_story,
    notify_reply_story,
)
from posts.models import Story, StoryView, StoryReaction
from services.blocks import is_blocked
from users.models import BaseUser
from services.conversations import (
    get_or_create_conversation,
    create_message,
)


def create_story(
        author: BaseUser,
        text: str | None = None,
        image=None,
        duration_hours: int = 24,
) -> Story:
    story = Story(
        author=author,
        text=text,
        image=image,
        expires_at=timezone.now() + timedelta(hours=duration_hours),
    )
    story.full_clean()
    story.save()

    return story


def delete_story(story: Story) -> None:
    story.delete()


@transaction.atomic
def create_story_reply(author, story, content):
    """
    Reply به استوری = DM.
    فقط Conversation + Message می‌سازه (بدون StoryReply).
    """
    if is_blocked(author, story.author):
        raise ValidationError("You cannot reply to this story.")

    if story.expires_at <= timezone.now():
        raise ValidationError("Story has expired.")

    conversation = get_or_create_conversation(
        user_a=author,
        user_b=story.author,
    )
    message = create_message(
        conversation=conversation,
        sender=author,
        content=content,
        via_story=story,  # ← جدید
    )

    notify_reply_story(
        actor=author,
        story=story,
        conversation=conversation,
    )

    return conversation, message


def mark_story_as_viewed(story: Story, viewer: BaseUser) -> StoryView:
    """
    Idempotent — اگر قبلاً دیده شده، همون record برمی‌گرده.
    """
    view, _ = StoryView.objects.get_or_create(
        story=story,
        viewer=viewer,
    )
    return view


def get_story_viewers(story: Story):
    """Return all viewers of a story, newest first."""
    return (
        StoryView.objects
        .filter(story=story)
        .select_related("viewer")
        .order_by("-created_at")
    )


ALLOWED_EMOJIS = {"❤️", "😂", "😮", "😢", "👍"}


@transaction.atomic  # ← جدید
def create_or_update_story_reaction(story, user, emoji):
    if emoji not in ALLOWED_EMOJIS:
        raise ValidationError(f"Invalid emoji. Allowed: {ALLOWED_EMOJIS}")

    if is_blocked(user, story.author):
        raise ValidationError("You cannot react to this story.")

    if story.author == user:
        raise ValidationError("You cannot react to your own story.")

    # ۱. ساخت conversation + message
    conversation = get_or_create_conversation(
        user_a=user,
        user_b=story.author,
    )
    create_message(
        conversation=conversation,
        sender=user,
        content=emoji,
        via_story=story,  # ← جدید
    )

    # ۲. reaction
    reaction, created = StoryReaction.objects.update_or_create(
        story=story,
        user=user,
        defaults={"emoji": emoji},
    )

    # ۳. Notification فقط اگه جدید بود
    if created:
        notify_react_story(
            actor=user,
            story=story,
            conversation=conversation,
        )

    return reaction


def delete_story_reaction(story: Story, user: BaseUser) -> None:
    StoryReaction.objects.filter(story=story, user=user).delete()


def get_story_reactions(story: Story):
    """لیست reactions گروه‌بندی‌شده بر اساس emoji."""
    return (
        StoryReaction.objects
        .filter(story=story)
        .values("emoji")
        .annotate(count=Count("id"))
        .order_by("-count")
    )


def get_user_reaction(story: Story, user: BaseUser) -> str | None:
    """اemoji کاربر برای یه story، یا None."""
    reaction = StoryReaction.objects.filter(story=story, user=user).first()
    if reaction is None:
        return None
    return reaction.emoji
