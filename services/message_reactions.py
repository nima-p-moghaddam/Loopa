from django.core.exceptions import ValidationError

from posts.models import Message, MessageReaction
from services.notifications import notify_react_message
from users.models import BaseUser


# ← افزایش تعداد ایموجی‌های مجاز
ALLOWED_MESSAGE_EMOJIS = {
    "❤️", "😂", "😮", "😢", "👍",
    "🔥", "🙏", "🎉", "😍", "😡"
}


def create_or_update_message_reaction(
        user: BaseUser,
        message: Message,
        emoji: str,
) -> MessageReaction | None:
    """
    Toggle semantics:
    - همون ایموجی → حذف (None برمی‌گرده)
    - ایموجی متفاوت → replace
    - نداشته → ساخت (با notification)
    """
    if emoji not in ALLOWED_MESSAGE_EMOJIS:
        raise ValidationError(f"Invalid emoji. Allowed: {ALLOWED_MESSAGE_EMOJIS}")

    if message.is_deleted:
        raise ValidationError("Cannot react to a deleted message.")

    # ← Fix: استفاده از participants برای هر دو حالت (گروه و ۱:۱)
    if not message.conversation.participants.filter(id=user.id).exists():
        raise ValidationError("You are not part of this conversation.")

    existing = MessageReaction.objects.filter(
        message=message, user=user,
    ).first()

    # Toggle off
    if existing and existing.emoji == emoji:
        existing.delete()
        return None

    is_new = existing is None

    reaction, _ = MessageReaction.objects.update_or_create(
        message=message,
        user=user,
        defaults={"emoji": emoji},
    )

    # فقط برای reaction جدید notification بفرست (نه برای replace)
    if is_new:
        notify_react_message(actor=user, message=message)

    return reaction


def delete_message_reaction(user: BaseUser, message: Message) -> None:
    MessageReaction.objects.filter(message=message, user=user).delete()