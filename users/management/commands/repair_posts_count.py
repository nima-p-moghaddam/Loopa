from django.core.management.base import BaseCommand
from django.db.models import Count, F, OuterRef, Subquery, IntegerField
from django.db.models.functions import Coalesce

from users.models import Profile
from posts.models import Post


class Command(BaseCommand):
    help = "Recompute Profile.posts_count from actual Post rows."

    def handle(self, *args, **options):
        subquery = (
            Post.objects
            .filter(author=OuterRef("user"))
            .values("author")
            .annotate(c=Count("*"))
            .values("c")
        )

        updated = (
            Profile.objects
            .update(
                posts_count=Coalesce(
                    Subquery(subquery, output_field=IntegerField()),
                    0,
                )
            )
        )

        self.stdout.write(
            self.style.SUCCESS(f"Recomputed posts_count for {updated} profiles.")
        )