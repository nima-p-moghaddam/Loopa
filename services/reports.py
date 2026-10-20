from django.core.exceptions import ValidationError

from posts.models import Report
from users.models import BaseUser


def create_report(
        reporter: BaseUser,
        reason: str,
        description: str | None = None,
        post=None,
        comment=None,
        reported_user: BaseUser | None = None,
) -> Report:
    # Validation: exactly one target
    targets_provided = sum(
        x is not None for x in (post, comment, reported_user)
    )
    if targets_provided != 1:
        raise ValidationError(
            "Exactly one of post, comment, or reported_user must be provided."
        )

    # Self-report check
    if reported_user and reported_user.id == reporter.id:
        raise ValidationError("You cannot report yourself.")

    if post and post.author_id == reporter.id:
        raise ValidationError("You cannot report your own post.")

    if comment and comment.user_id == reporter.id:
        raise ValidationError("You cannot report your own comment.")

    # Duplicate check
    if post:
        existing = Report.objects.filter(
            reporter=reporter, post=post,
        ).first()
    elif comment:
        existing = Report.objects.filter(
            reporter=reporter, comment=comment,
        ).first()
    else:
        existing = Report.objects.filter(
            reporter=reporter, reported_user=reported_user,
        ).first()

    if existing:
        raise ValidationError(
            "You have already reported this. Our team is reviewing."
        )

    report = Report(
        reporter=reporter,
        reason=reason,
        description=description,
        post=post,
        comment=comment,
        reported_user=reported_user,
    )
    report.full_clean()
    report.save()

    return report