from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('posts', '0006_recreate_subscription_and_search_vector'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name='post',
                    name='search_vector',
                ),
            ],
            database_operations=[],
        ),
    ]