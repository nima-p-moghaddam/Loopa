import django.contrib.postgres.search
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('posts', '0005_add_search_vector_to_post'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='subscription',
            unique_together={('subscriber', 'target')},
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='post',
                    name='search_vector',
                    field=django.contrib.postgres.search.SearchVectorField(
                        editable=False,
                        null=True,
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]