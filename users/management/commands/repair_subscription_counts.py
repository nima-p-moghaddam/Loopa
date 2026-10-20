from django.core.management.base import BaseCommand
from django.db.models import Count, F, IntegerField, OuterRef, Subquery
from django.db.models.functions import Coalesce

from posts.models import Subscription
from users.models import Profile


class Command(BaseCommand):
    help = "Recompute Profile.subscriber_count and subscription_count."

    def handle(self, *args, **options):
        # subscription_count = تعداد کاربرانی که این user دنبال می‌کنه
        subscription_subquery = (
            Subscription.objects
            .filter(subscriber=OuterRef("user"))
            .values("subscriber")
            .annotate(c=Count("*"))
            .values("c")
        )

        # subscriber_count = تعداد کاربرانی که این user رو دنبال می‌کنن
        subscriber_subquery = (
            Subscription.objects
            .filter(target=OuterRef("user"))
            .values("target")
            .annotate(c=Count("*"))
            .values("c")
        )

        updated = Profile.objects.update(
            subscription_count=Coalesce(
                Subquery(subscription_subquery, output_field=IntegerField()),
                0,
            ),
            subscriber_count=Coalesce(
                Subquery(subscriber_subquery, output_field=IntegerField()),
                0,
            ),
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Recomputed subscription counts for {updated} profiles."
            )
        )