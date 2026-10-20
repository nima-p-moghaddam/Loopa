from django.db import transaction
from django.db.models import Q

from posts.models import Block, Subscription
from services.posts_cache import invalidate_posts_list_cache
from users.models import BaseUser


@transaction.atomic
def create_block(blocker: BaseUser, blocked: BaseUser) -> Block:
    block = Block(blocker=blocker, blocked=blocked)
    block.full_clean()
    block.save()

    _cancel_subscriptions_between(blocker, blocked)

    invalidate_posts_list_cache()

    return block


@transaction.atomic
def delete_block(block: Block) -> None:
    block.delete()

    invalidate_posts_list_cache()


def get_blocked_user_ids(user: BaseUser) -> set[int]:
    if not user or not user.is_authenticated:
        return set()

    blocks = Block.objects.filter(
        Q(blocker=user) | Q(blocked=user)
    ).values_list("blocker_id", "blocked_id")

    ids = set()
    for blocker_id, blocked_id in blocks:
        ids.add(blocker_id)
        ids.add(blocked_id)
    ids.discard(user.id)
    return ids


def is_blocked(user_a: BaseUser, user_b: BaseUser) -> bool:
    return Block.objects.filter(
        Q(blocker=user_a, blocked=user_b) |
        Q(blocker=user_b, blocked=user_a)
    ).exists()


def _cancel_subscriptions_between(user_a: BaseUser, user_b: BaseUser) -> None:
    """Cancel subscriptions in both directions.
    Profile counts are auto-updated by signals.
    """
    Subscription.objects.filter(
        Q(subscriber=user_a, target=user_b) |
        Q(subscriber=user_b, target=user_a)
    ).delete()