from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from posts.models import Conversation, Message, ConversationSettings
from services.blocks import is_blocked
from services.notifications import notify_reply_message
from users.models import BaseUser


# ============================================================
# Helpers
# ============================================================

def _order_users(user_a: BaseUser, user_b: BaseUser) -> tuple[BaseUser, BaseUser]:
    if user_a.id < user_b.id:
        return user_a, user_b
    return user_b, user_a


def _is_participant(conversation: Conversation, user: BaseUser) -> bool:
    return conversation.participants.filter(id=user.id).exists()


def _is_creator(conversation: Conversation, user: BaseUser) -> bool:
    return conversation.creator_id == user.id


# ============================================================
# Conversations (Create)
# ============================================================

@transaction.atomic
def get_or_create_conversation(user_a: BaseUser, user_b: BaseUser) -> Conversation:
    if user_a == user_b:
        raise ValidationError("You cannot start a conversation with yourself")

    if is_blocked(user_a, user_b):
        raise ValidationError("You cannot message this user.")

    u1, u2 = _order_users(user_a, user_b)

    conversation = Conversation.objects.filter(
        is_group=False,
        user_a=u1,
        user_b=u2,
    ).first()

    if conversation is None:
        conversation = Conversation.objects.create(
            is_group=False,
            user_a=u1,
            user_b=u2,
        )
        conversation.participants.add(u1, u2)
    else:
        conversation.participants.add(u1, u2)

    return conversation


@transaction.atomic
def create_group_conversation(creator: BaseUser, participant_ids: list[int]) -> Conversation:
    if not participant_ids:
        raise ValidationError("برای ساخت گروه حداقل ۲ نفر رو انتخاب کن")

    unique_ids = set(participant_ids) - {creator.id}

    if len(unique_ids) < 2:
        raise ValidationError("برای ساخت گروه حداقل ۲ نفر رو انتخاب کن")

    participants = list(BaseUser.objects.filter(id__in=unique_ids))

    if len(participants) != len(unique_ids):
        raise ValidationError("یکی از کاربران انتخاب‌شده معتبر نیست")

    for p in participants:
        if is_blocked(creator, p):
            raise ValidationError("نمی‌تونی کسی که بلاک کردی رو به گروه اضافه کنی")

    conversation = Conversation.objects.create(
        is_group=True,
        user_a=None,
        user_b=None,
        creator=creator,  # ← fix: creator همیشه ست می‌شود
    )
    conversation.participants.add(creator, *participants)

    return conversation


# ============================================================
# Messages (Create / Read / Update / Delete)
# ============================================================

@transaction.atomic
def create_message(
        conversation: Conversation,
        sender: BaseUser,
        content: str = "",
        image=None,
        audio=None,
        audio_duration: int | None = None,
        via_story=None,
        reply_to: Message | None = None,
        shared_post=None,  # ← اضافه شد
) -> Message:
    if conversation.is_group:
        if not _is_participant(conversation, sender):
            raise ValidationError("You are not part of this conversation.")
    else:
        if sender not in (conversation.user_a, conversation.user_b):
            raise ValidationError("You are not part of this conversation.")

        other = (
            conversation.user_b
            if sender == conversation.user_a
            else conversation.user_a
        )
        if is_blocked(sender, other):
            raise ValidationError("You cannot message this user.")

    has_content = bool(content and content.strip())
    has_image = image is not None
    has_audio = audio is not None
    has_shared_post = shared_post is not None  # ← اضافه شد

    if not (has_content or has_image or has_audio or has_shared_post):  # ← آپدیت شد
        raise ValidationError("Message must have content, image, audio, or shared post.")

    if reply_to is not None:
        if reply_to.conversation_id != conversation.id:
            raise ValidationError("Cannot reply to a message from another conversation.")
        if reply_to.is_deleted:
            raise ValidationError("Cannot reply to a deleted message.")

    message = Message(
        conversation=conversation,
        sender=sender,
        content=content or "",
        image=image,
        audio=audio,
        audio_duration=audio_duration if has_audio else None,
        via_story=via_story,
        was_story_reply=(via_story is not None),
        reply_to=reply_to,
        shared_post=shared_post,  # ← اضافه شد
    )
    message.full_clean()
    message.save()

    Conversation.objects.filter(id=conversation.id).update(last_message_at=timezone.now())

    if reply_to is not None:
        notify_reply_message(actor=sender, message=message)

    return message


def get_conversation_messages(conversation: Conversation):
    return (
        Message.objects
        .filter(conversation=conversation)
        .select_related("sender", "sender__profile")
        .prefetch_related("reactions")
        .order_by("-created_at")
    )


def mark_conversation_as_read(conversation: Conversation, user: BaseUser) -> int:
    if conversation.is_group:
        is_member = _is_participant(conversation, user)
    else:
        is_member = user in (conversation.user_a, conversation.user_b)

    if not is_member:
        raise ValidationError("You are not part of this conversation.")

    updated = (
        Message.objects
        .filter(conversation=conversation, is_read=False)
        .exclude(sender=user)
        .update(is_read=True, read_at=timezone.now())
    )
    return updated


def update_message(message: Message, user: BaseUser, content: str) -> Message:
    if message.sender != user:
        raise ValidationError("You can only edit your own messages.")
    if message.is_deleted:
        raise ValidationError("Cannot edit a deleted message.")
    if timezone.now() - message.created_at > timedelta(minutes=15):
        raise ValidationError("Cannot edit after 15 minutes.")

    message.content = content
    message.edited_at = timezone.now()
    message.save(update_fields=["content", "edited_at", "updated_at"])
    return message


def delete_message(message: Message, user: BaseUser) -> Message:
    if message.sender != user:
        raise ValidationError("You can only delete your own messages.")
    if message.is_deleted:
        raise ValidationError("Message is already deleted.")

    message.is_deleted = True
    message.deleted_at = timezone.now()
    message.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
    return message


# ============================================================
# Conversation Settings
# ============================================================

def get_conversation_settings(conversation: Conversation, user: BaseUser) -> ConversationSettings:
    settings, _ = ConversationSettings.objects.get_or_create(
        conversation=conversation,
        user=user,
    )
    return settings


def update_conversation_settings(
        conversation: Conversation,
        user: BaseUser,
        is_muted: bool | None = None,
        is_archived: bool | None = None,
) -> ConversationSettings:
    settings = get_conversation_settings(conversation, user)

    update_fields = []
    if is_muted is not None:
        settings.is_muted = is_muted
        update_fields.append("is_muted")
    if is_archived is not None:
        settings.is_archived = is_archived
        update_fields.append("is_archived")

    if update_fields:
        settings.save(update_fields=update_fields + ["updated_at"])

    return settings


# ============================================================
# Group Management
# ============================================================

@transaction.atomic
def update_group_info(
        conversation: Conversation,
        user: BaseUser,
        title: str | None = None,
        avatar=None,
) -> Conversation:
    if not conversation.is_group:
        raise ValidationError("This is not a group.")

    if not _is_participant(conversation, user):
        raise ValidationError("You are not a member of this group.")

    if not _is_creator(conversation, user):
        raise ValidationError("Only the group creator can update group info.")

    if title is not None:
        cleaned = title.strip()
        if not cleaned:
            raise ValidationError("Group title cannot be empty.")
        conversation.title = cleaned

    if avatar is not None:
        conversation.group_avatar = avatar

    conversation.save()
    return conversation


@transaction.atomic
def add_group_participant(
        conversation: Conversation,
        actor: BaseUser,
        new_user: BaseUser,
) -> Conversation:
    if not conversation.is_group:
        raise ValidationError("This is not a group.")

    if not _is_participant(conversation, actor):
        raise ValidationError("You are not a member of this group.")

    if actor.id == new_user.id:
        raise ValidationError("You cannot add yourself.")

    if is_blocked(actor, new_user):
        raise ValidationError("You cannot add a user you have blocked or who blocked you.")

    if _is_participant(conversation, new_user):
        raise ValidationError("User is already in the group.")

    conversation.participants.add(new_user)
    return conversation


@transaction.atomic
def remove_group_participant(
        conversation: Conversation,
        actor: BaseUser,
        target_user: BaseUser,
) -> Conversation:
    if not conversation.is_group:
        raise ValidationError("This is not a group.")

    if not _is_creator(conversation, actor):
        raise ValidationError("Only the group creator can remove members.")

    if actor.id == target_user.id:
        raise ValidationError("Use the leave endpoint to remove yourself.")

    if not _is_participant(conversation, target_user):
        raise ValidationError("User is not a member of this group.")

    conversation.participants.remove(target_user)
    return conversation


@transaction.atomic
def leave_group(conversation: Conversation, user: BaseUser) -> Conversation:
    if not conversation.is_group:
        raise ValidationError("This is not a group.")

    if not _is_participant(conversation, user):
        raise ValidationError("You are not in this group.")

    other_participants = (
        conversation.participants.exclude(id=user.id).order_by("id")
    )

    # آخرین عضو → گروه حذف شود
    if not other_participants.exists():
        conversation.delete()
        return conversation

    # creator خارج می‌شود → مالکیت منتقل شود
    if _is_creator(conversation, user):
        new_creator = other_participants.first()
        conversation.creator = new_creator
        conversation.save(update_fields=["creator", "updated_at"])

    conversation.participants.remove(user)
    return conversation
