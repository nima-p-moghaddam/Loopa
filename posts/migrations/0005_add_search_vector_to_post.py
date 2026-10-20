from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('posts', '0004_post_post_title_trgm_idx'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE posts_post
                    ADD COLUMN search_vector tsvector
                        GENERATED ALWAYS AS (
                            to_tsvector(
                                    'english',
                                    coalesce(title, '') || ' ' || coalesce(content, '')
                            )
                            ) STORED;
                """,
            reverse_sql="""
                        ALTER TABLE posts_post
                        DROP
                        COLUMN search_vector;
                        """,
        ),
        migrations.RunSQL(
            sql="""
                CREATE INDEX post_search_vector_idx
                    ON posts_post
                    USING GIN (search_vector);
                """,
            reverse_sql="""
                        DROP INDEX IF EXISTS post_search_vector_idx;
                        """,
        ),
    ]
