import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from posts.models import Story

logger = logging.getLogger(__name__)


@shared_task
def send_subscription_email(subscriber_email: str, target_email: str) -> str:
    subject = "New subscription"
    message = (
        f"User {subscriber_email} just subscribed to {target_email}."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[target_email],
        fail_silently=False,
    )

    logger.info(
        "Sent subscription email: %s -> %s",
        subscriber_email,
        target_email,
    )

    return f"Email sent to {target_email}"


@shared_task
def cleanup_expired_stories() -> int:
    cutoff = timezone.now()

    deleted_count, _ = Story.objects.filter(
        expires_at__lt=cutoff,
    ).delete()

    logger.info("Deleted %s expired stories", deleted_count)

    return deleted_count