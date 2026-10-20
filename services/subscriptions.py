from django.core.exceptions import ValidationError
from django.db import transaction

from services.notifications import notify_follow
from posts.models import Subscription
from services.blocks import is_blocked
from users.models import BaseUser


@transaction.atomic
def create_subscription(subscriber: BaseUser, target: BaseUser) -> Subscription:
    if is_blocked(subscriber, target):
        raise ValidationError("You cannot subscribe to this user.")

    subscription = Subscription(
        subscriber=subscriber,
        target=target,
    )
    subscription.full_clean()
    subscription.save()

    notify_follow(actor=subscriber, target=target)

    return subscription


@transaction.atomic
def delete_subscription(subscription: Subscription) -> None:
    subscription.delete()
