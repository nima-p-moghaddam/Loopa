import re

from users.models import BaseUser


# پایتون ۳ پیش‌فرض Unicode
MENTION_REGEX = re.compile(r"@(\w{1,30})")


def extract_mentions(text: str) -> list[str]:
    """
    استخراج mention ها از متن، lowercased، deduplicated، max 20.
    """
    if not text:
        return []

    matches = MENTION_REGEX.findall(text)
    seen = set()
    result = []
    for m in matches:
        name = m.lower()
        if name in seen:
            continue
        seen.add(name)
        result.append(name)
        if len(result) >= 20:
            break
    return result


def sync_mentions(instance) -> list[BaseUser]:
    """
    استخراج mention ها از instance.content و set روی instance.mentioned_users.
    Returns list of mentioned users.
    """
    names = extract_mentions(instance.content or "")

    if not names:
        instance.mentioned_users.clear()
        return []

    users = list(
        BaseUser.objects
        .filter(profile__page_name__in=names)
        .exclude(id=instance.author_id if hasattr(instance, "author_id") else instance.user_id)
    )

    instance.mentioned_users.set(users)
    return users