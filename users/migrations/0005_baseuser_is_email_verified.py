from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0004_baseuser_last_seen'),
    ]

    operations = [
        migrations.AddField(
            model_name='baseuser',
            name='is_email_verified',
            field=models.BooleanField(default=False),
        ),
        # ← کاربرهای موجود رو True کن
        migrations.RunPython(
            lambda apps, schema_editor: apps.get_model('users', 'BaseUser')
                .objects.update(is_email_verified=True),
            migrations.RunPython.noop,
        ),
    ]