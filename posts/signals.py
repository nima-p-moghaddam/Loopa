from django.db.models import F
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from posts.models import Post, Comment, Subscription
from users.models import Profile
from services.mentions import sync_mentions
from services.notifications import notify_mention

from services.hashtags import sync_post_hashtags


# ============================================================
# Post counts
# ============================================================

@receiver(post_save, sender=Post)
def increment_posts_count(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.author_id is None:
        return
    Profile.objects.filter(user_id=instance.author_id).update(
        posts_count=F("posts_count") + 1
    )


@receiver(post_delete, sender=Post)
def decrement_posts_count(sender, instance, **kwargs):
    if instance.author_id is None:
        return
    Profile.objects.filter(user_id=instance.author_id).update(
        posts_count=F("posts_count") - 1
    )


# ============================================================
# Subscription counts
# ============================================================

@receiver(post_save, sender=Subscription)
def increment_subscription_counts(sender, instance, created, **kwargs):
    if not created:
        return

    # subscriber's subscription_count +1
    Profile.objects.filter(user_id=instance.subscriber_id).update(
        subscription_count=F("subscription_count") + 1
    )
    # target's subscriber_count +1
    Profile.objects.filter(user_id=instance.target_id).update(
        subscriber_count=F("subscriber_count") + 1
    )


@receiver(post_delete, sender=Subscription)
def decrement_subscription_counts(sender, instance, **kwargs):
    Profile.objects.filter(user_id=instance.subscriber_id).update(
        subscription_count=F("subscription_count") - 1
    )
    Profile.objects.filter(user_id=instance.target_id).update(
        subscriber_count=F("subscriber_count") - 1
    )


@receiver(post_save, sender=Post)
def sync_hashtags_on_post(sender, instance, created, **kwargs):
    """هر بار که پست ساخته یا آپدیت شد، hashtagها رو sync کن."""
    sync_post_hashtags(instance)


@receiver(post_save, sender=Post)
def sync_post_mentions(sender, instance, created, **kwargs):
    """هر بار که پست ساخته/آپدیت شد، mention ها رو sync کن."""
    mentioned_users = sync_mentions(instance)

    # Notification فقط برای پست جدید
    if created and instance.author:
        for user in mentioned_users:
            notify_mention(
                actor=instance.author,
                recipient=user,
                post=instance,
            )


@receiver(post_save, sender=Comment)
def sync_comment_mentions(sender, instance, created, **kwargs):
    """هر بار که کامنت ساخته/آپدیت شد، mention ها رو sync کن."""
    mentioned_users = sync_mentions(instance)

    if created and instance.user:
        for user in mentioned_users:
            notify_mention(
                actor=instance.user,
                recipient=user,
                post=instance.post,
                comment=instance,
            )
