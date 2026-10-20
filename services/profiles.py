from users.models import Profile


def update_profile(
        profile: Profile,
        page_name: str | None = None,
        bio: str | None = None,
        full_name: str | None = None,
) -> Profile:
    """
    Update profile fields. Only provided fields are changed.
    """
    update_fields = []

    if page_name is not None:
        cleaned_page_name = page_name.lower().strip()
        if cleaned_page_name and cleaned_page_name != profile.page_name:
            profile.page_name = cleaned_page_name
            update_fields.append("page_name")

    if bio is not None:
        profile.bio = bio
        update_fields.append("bio")

    if full_name is not None:
        profile.full_name = full_name.strip() if full_name else None
        update_fields.append("full_name")

    if update_fields:
        # برای اینکه validatorهای مدل (مثل RESERVED_PAGE_NAMES) هم چک بشن
        profile.full_clean()
        profile.save(update_fields=update_fields)

    return profile