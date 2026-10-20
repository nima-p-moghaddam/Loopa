import re

from posts.models import Hashtag, Post


# پایتون ۳ به‌طور پیش‌فرض re.UNICODE داره → \w شامل فارسی هم می‌شه
HASHTAG_REGEX = re.compile(r"#(\w{1,50})")


def extract_hashtags(text: str) -> list[str]:
    """
    استخراج hashtagها از متن، lowercased، deduplicated، max 30.
    """
    if not text:
        return []

    matches = HASHTAG_REGEX.findall(text)
    # lowercase + dedupe (maintaining order)
    seen = set()
    result = []
    for m in matches:
        name = m.lower()
        if name in seen:
            continue
        seen.add(name)
        result.append(name)
        if len(result) >= 30:
            break
    return result


def sync_post_hashtags(post: Post) -> None:
    """
    استخراج hashtagها از content و set روی post.
    """
    names = extract_hashtags(post.content or "")

    if not names:
        post.hashtags.clear()
        return

    # get_or_create برای همه
    hashtag_objs = []
    for name in names:
        tag, _ = Hashtag.objects.get_or_create(name=name)
        hashtag_objs.append(tag)

    post.hashtags.set(hashtag_objs)