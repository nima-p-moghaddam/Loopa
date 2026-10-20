from django.db.models import Q, Exists, OuterRef

from posts.models import Conversation, ConversationSettings
from users.models import BaseUser


def get_user_conversations(user: BaseUser):
    """
    لیست مکالمات کاربر (هم 1:1، هم گروه).
    مرتب‌شده بر اساس last_message_at.
    """
    settings_qs = ConversationSettings.objects.filter(
        conversation=OuterRef("pk"),
        user=user,
    )

    return (
        Conversation.objects
        .filter(participants=user)
        .select_related(
            "user_a", "user_a__profile",
            "user_b", "user_b__profile",
        )
        .prefetch_related(
            "participants__profile",
        )
        .annotate(
            _is_muted=Exists(settings_qs.filter(is_muted=True)),
            _is_archived=Exists(settings_qs.filter(is_archived=True)),
        )
        .order_by("-last_message_at", "-created_at")
        .distinct()
    )