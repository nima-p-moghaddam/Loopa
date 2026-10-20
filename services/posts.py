from django.db import transaction

from posts.models import Post, PostImage
from services.posts_cache import invalidate_posts_list_cache
from users.models import BaseUser


@transaction.atomic
def create_post(
        slug: str,
        title: str,
        content: str,
        author: BaseUser,
        images: list | None = None,
) -> Post:
    post = Post(
        slug=slug,
        title=title,
        content=content,
        author=author,
    )
    post.full_clean()
    post.save()

    if images:
        PostImage.objects.bulk_create([
            PostImage(post=post, image=img, order=idx)
            for idx, img in enumerate(images)
        ])

    invalidate_posts_list_cache()
    return post


@transaction.atomic
def delete_post(post: Post) -> None:
    post.delete()
    invalidate_posts_list_cache()


@transaction.atomic
def update_post(
        post: Post,
        title: str,
        content: str,
        new_images: list | None = None,
        keep_image_ids: list[int] | None = None,
) -> Post:
    post.title = title
    post.content = content
    post.full_clean()
    post.save()

    # ← پاک کردن عکس‌هایی که کاربر آن‌ها را از لیست حذف کرده است
    if keep_image_ids is not None:
        post.images.exclude(id__in=keep_image_ids).delete()

    # ← اضافه کردن عکس‌های جدید به انتهای لیست
    if new_images:
        # پیدا کردن آخرین order برای اینکه عکس‌های جدید در ادامه قبلی‌ها قرار بگیرند
        max_order_img = post.images.order_by('-order').first()
        start_order = (max_order_img.order + 1) if max_order_img else 0

        PostImage.objects.bulk_create([
            PostImage(post=post, image=img, order=start_order + idx)
            for idx, img in enumerate(new_images)
        ])

    invalidate_posts_list_cache()
    return post