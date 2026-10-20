from celery import shared_task
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
import logging

logger = logging.getLogger(__name__)


@shared_task
def cleanup_expired_tokens() -> int:
    cutoff = timezone.now()

    deleted_count, _ = OutstandingToken.objects.filter(
        expires_at__lt=cutoff,
    ).delete()

    logger.info("Deleted %s expired tokens", deleted_count)

    return deleted_count